const axios = require('axios');
const OpenAI = require('openai');
const { Ollama } = require('ollama');
const http = require('http');
const { Agent } = require('undici');
const fileService = require('./fileService');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Ollama client
const ollama = new Ollama({
  host: 'http://127.0.0.1:11434'
});

function getModelConfig(selectedModel) {
  if (!selectedModel) {
    // Default to GPT-4 if no model specified
    return {
      type: 'openai',
      model: 'gpt-4-turbo-preview',
      skipSystem: false,
      endpoint: 'https://api.openai.com/v1/chat/completions'
    };
  }

  const [provider, model] = selectedModel.split(':');

  switch (provider.toLowerCase()) {
    case 'openai':
      const isO1Model = model?.toLowerCase().includes('o1');
      return {
        type: 'openai',
        model: model || 'gpt-4-turbo-preview',
        skipSystem: isO1Model,
        isO1Model,
        endpoint: 'https://api.openai.com/v1/chat/completions'
      };
    case 'anthropic':
      return {
        type: 'anthropic',
        model: model || 'claude-3-opus-20240229',
        skipSystem: false,
        endpoint: 'https://api.anthropic.com/v1/messages'
      };
    case 'ollama':
      return {
        type: 'ollama',
        model: model || 'deepseek-coder:33b',
        skipSystem: true,
        endpoint: 'http://127.0.0.1:11434/api/generate'
      };
    default:
      // Default to GPT-4 for unknown providers
      return {
        type: 'openai',
        model: 'gpt-4-turbo-preview',
        skipSystem: false,
        endpoint: 'https://api.openai.com/v1/chat/completions'
      };
  }
}

function constructPrompt(message, avatar, previousResponses = [], selectedFiles = []) {
  let prompt = `You are ${avatar.name}, ${avatar.role}. ${avatar.description || ''}\nYour skills include: ${Array.isArray(avatar.skills) ? avatar.skills.join(", ") : avatar.skills}\n\n`;

  // Add Chart.js instructions with explicit markers for graph JSON
  prompt += `When creating charts or graphs, please use Chart.js format. Wrap your graph JSON output between explicit markers [GRAPH_START] and [GRAPH_END]. For example:

[GRAPH_START]
{
  "type": "bar",
  "data": {
    "labels": ["Category A", "Category B"],
    "datasets": [{
      "label": "Values",
      "data": [10, 20],
      "backgroundColor": "rgba(75, 192, 192, 0.2)",
      "borderColor": "rgba(75, 192, 192, 1)"
    }]
  },
  "options": {
    "responsive": true,
    "maintainAspectRatio": false
  }
}
[GRAPH_END]

Supported chart types: bar, line, pie, doughnut. Follow Chart.js data structure exactly.\n\n`;

  // Add information about available files and their content
  if (selectedFiles && selectedFiles.length > 0) {
    prompt += "Here are the contents of the selected files:\n\n";
    selectedFiles.forEach(file => {
      prompt += `=== File: ${file.filename} (Type: ${file.type}) ===\n`;
      prompt += `{{file:${file.id}}}\n\n`;
    });
  }

  // Add previous responses to the context if they exist
  if (previousResponses.length > 0) {
    prompt += "Previous responses in this conversation:\n";
    previousResponses.forEach(resp => {
      prompt += `${resp.avatar}: ${resp.message}\n`;
    });
    prompt += "\n";
  }

  // Modify the instruction based on whether this is a follow-up response
  if (previousResponses.length > 0) {
    prompt += `Please respond to the following message, building upon and adding value to the previous responses. Focus on providing new insights or perspectives that haven't been mentioned. Do not repeat pleasantries or file acknowledgments.\n\n${message}\n\n`;
    prompt += "Remember to:\n";
    prompt += "1. Only add new information or insights\n";
    prompt += "2. Skip any pleasantries or file acknowledgments\n";
    prompt += "3. Be concise and direct\n";
    prompt += "4. Reference and build upon previous points when relevant\n";
  } else {
    prompt += `Please respond to the following message in your unique voice and perspective, drawing upon your role and skills and the content provided.\n\n${message}\n\n`;
  }

  // Only include additional instruction if not using O1 model
  if (!avatar.selectedModel || !avatar.selectedModel.toLowerCase().includes("o1")) {
    prompt += "Remember to stay in character and provide insights based on your specific expertise.";
  }

  console.log("Constructed prompt:", prompt);
  return prompt;
}

function extractThinking(text) {
  const thinkRegex = /<think>(.*?)<\/think>/gs;
  const thoughts = [];
  let cleanedText = text;
  
  let match;
  while ((match = thinkRegex.exec(text)) !== null) {
    thoughts.push(match[1].trim());
    // Remove the thinking content from the main text
    cleanedText = cleanedText.replace(match[0], '');
  }
  
  return {
    cleanedText: cleanedText.trim(),
    thoughts: thoughts.join('\n\n')
  };
}

async function processPromptWithFiles(prompt) {
  // Look for file references in the format {{file:FILE_ID}}
  const fileRegex = /{{file:([^}]+)}}/g;
  let match;
  let processedPrompt = prompt;
  
  console.log('Processing prompt with files. Initial prompt:', prompt);
  
  while ((match = fileRegex.exec(prompt)) !== null) {
    const fileId = match[1];
    console.log('Found file reference:', fileId);
    try {
      console.log('Attempting to read file content for:', fileId);
      const content = await fileService.getFileMarkdownContent(fileId);
      console.log('Successfully read file content, length:', content.length);
      processedPrompt = processedPrompt.replace(match[0], content);
    } catch (error) {
      console.error(`Error reading file ${fileId}:`, error);
      processedPrompt = processedPrompt.replace(match[0], `[Error reading file: ${fileId}]`);
    }
  }
  
  console.log('Final processed prompt length:', processedPrompt.length);
  return processedPrompt;
}

async function getResponse(message, avatar, previousResponses = [], onUpdate, selectedFiles = []) {
  const prompt = constructPrompt(message, avatar, previousResponses, selectedFiles);
  const processedPrompt = await processPromptWithFiles(prompt);
  let modelConfig = getModelConfig(avatar.selectedModel);
  
  // Add round calculation after retrieving modelConfig, before try block
  const round = previousResponses.reduce((max, resp) => Math.max(max, resp.round || 0), 0) + 1;

  try {
    let response;
    
    switch (modelConfig.type) {
      case 'openai':
        const messages = modelConfig.skipSystem 
          ? [{ role: "user", content: processedPrompt }]
          : [
              { role: "system", content: "You are a helpful AI assistant." },
              { role: "user", content: processedPrompt }
            ];

        try {
          // Configure parameters for streaming
          const params = {
            model: modelConfig.model,
            messages,
            stream: true
          };
          if (!modelConfig.isO1Model) {
            params.temperature = 0.7;
          }

          // Send initial thinking update if onUpdate is provided
          if (onUpdate) {
            onUpdate({
              avatarId: avatar.id,
              avatarName: avatar.name,
              imageUrl: avatar.imageUrl || null,
              response: `${avatar.name} is thinking...`,
              isThinking: true,
              round
            });
          }

          let fullResponse = '';
          const stream = await openai.chat.completions.create(params);
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            fullResponse += content;
            
            // Send streaming update through SSE
            if (content && onUpdate) {
              try {
                await onUpdate({
                  response: content,
                  isStreaming: true
                });
              } catch (error) {
                console.error('Error sending chunk to client:', error);
              }
            }
          }

          // Send completion message
          if (onUpdate) {
            await onUpdate({
              response: fullResponse,
              complete: true
            });
          }

          return {
            responses: [{
              avatarId: avatar.id,
              avatarName: avatar.name,
              imageUrl: avatar.imageUrl || null,
              response: fullResponse,
              isStreaming: false,
              round
            }]
          };
        } catch (openaiError) {
          console.error('OpenAI API error:', openaiError);
          throw new Error(openaiError.message || 'OpenAI API error');
        }
        break;

      case 'anthropic':
        // Send thinking state
        if (onUpdate) {
          onUpdate({
            avatarId: avatar.id,
            avatarName: avatar.name,
            response: `${avatar.name} is thinking...`,
            isThinking: true,
            round: round
          });
        }

        const claudeResponse = await anthropic.messages.create({
          model: modelConfig.model,
          max_tokens: 4000,
          messages: [{ role: "user", content: processedPrompt }],
          stream: true
        });

        let claudeFullResponse = '';
        for await (const chunk of claudeResponse) {
          const content = chunk.delta?.text || '';
          claudeFullResponse += content;
          
          // Send streaming update
          if (onUpdate && content) {
            onUpdate({
              avatarId: avatar.id,
              avatarName: avatar.name,
              response: claudeFullResponse,
              isStreaming: true,
              round: round
            });
          }
        }

        response = {
          responses: [{
            avatarId: avatar.id,
            avatarName: avatar.name,
            response: claudeFullResponse,
            isStreaming: false,
            round: round
          }]
        };
        break;

      case 'ollama':
        // Send thinking state update
        if (onUpdate) {
          onUpdate({
            avatarId: avatar.id,
            avatarName: avatar.name,
            response: `${avatar.name} is thinking...`,
            isThinking: true,
            round
          });
        }

        console.log('Using Ollama client for generation with model:', modelConfig.model);

        try {
          let fullResponse = "";
          // Use the Ollama client instance to generate a response with streaming
          const stream = await ollama.generate({
            model: modelConfig.model,
            prompt: processedPrompt,
            stream: true
          });

          for await (const chunk of stream) {
            if (chunk.response) {
              fullResponse += chunk.response;
              if (onUpdate) {
                // Parse thinking content from the response
                const { cleanedText, thoughts } = extractThinking(fullResponse);
                onUpdate({
                  avatarId: avatar.id,
                  avatarName: avatar.name,
                  imageUrl: avatar.imageUrl || null,
                  response: cleanedText,
                  thinkingContent: thoughts,
                  hasThinking: thoughts.length > 0,
                  isStreaming: true,
                  round
                });
              }
            }
          }

          // Parse final response
          const { cleanedText, thoughts } = extractThinking(fullResponse);
          response = {
            responses: [{
              avatarId: avatar.id,
              avatarName: avatar.name,
              imageUrl: avatar.imageUrl || null,
              response: cleanedText,
              thinkingContent: thoughts,
              hasThinking: thoughts.length > 0,
              isStreaming: false,
              round
            }]
          };
        } catch (err) {
          console.error('Ollama client generate error:', err);
          response = {
            responses: [{
              avatarId: avatar.id,
              avatarName: avatar.name,
              imageUrl: avatar.imageUrl || null,
              response: "I'm sorry, I'm currently unable to generate a response.",
              isStreaming: false,
              round
            }]
          };
        }
        break;

      default:
        throw new Error(`Unsupported model type: ${modelConfig.type}`);
    }

    // Validate response
    if (!response || !response.responses || !response.responses[0] || !response.responses[0].response) {
      throw new Error('Empty or invalid response from model');
    }

    return response;
  } catch (error) {
    throw new Error(`Error getting response from ${modelConfig.type}: ${error.message}`);
  }
}

module.exports = {
  getResponse
};