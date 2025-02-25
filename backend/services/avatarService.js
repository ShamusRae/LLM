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

  // Add formatting instructions
  prompt += `Please format your response using these guidelines:

1. For regular text, use standard markdown formatting:
   - Use **bold** for emphasis
   - Use *italics* for subtle emphasis
   - Use bullet points or numbered lists where appropriate
   - Use > for blockquotes
   - Use \`inline code\` for technical terms

2. For tables, use proper markdown table format:
   | Header 1 | Header 2 |
   |----------|----------|
   | Cell 1   | Cell 2   |

3. For code blocks, use triple backticks with language specification:
   \`\`\`python
   def example():
       return "Hello World"
   \`\`\`

4. For data visualizations, you MUST ALWAYS wrap the Vega-Lite specification in [GRAPH_START] and [GRAPH_END] markers exactly as shown below. The markers are required for the visualization to work:

   [GRAPH_START]
   {
     "description": "Chart Title",
     "data": {
       "values": [
         {"x": "Category A", "y": 10},
         {"x": "Category B", "y": 20}
       ]
     },
     "mark": "bar",
     "encoding": {
       "x": {"field": "x", "type": "ordinal"},
       "y": {"field": "y", "type": "quantitative"}
     }
   }
   [GRAPH_END]

   IMPORTANT: Always include both [GRAPH_START] and [GRAPH_END] markers. Never output a Vega-Lite specification without these markers.\n\n`;

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

function extractThinking(text, model = '') {
  // Original thinking tags extraction
  const thinkRegex = /<think>(.*?)<\/think>/gs;
  const thoughts = [];
  let cleanedText = text;
  let hasIntermediateContent = false;
  
  // Extract content from explicit thinking tags
  let match;
  while ((match = thinkRegex.exec(text)) !== null) {
    thoughts.push(match[1].trim());
    // Remove the thinking content from the main text
    cleanedText = cleanedText.replace(match[0], '');
    hasIntermediateContent = true;
  }
  
  // For models like Phi-4 that don't use thinking tags but produce intermediate content
  if (model.toLowerCase().includes('phi') || !hasIntermediateContent) {
    // Look for patterns that indicate intermediate thinking/reasoning
    const intermediatePatterns = [
      // Common intermediate thinking markers
      /^Let me think about this\.\.\./im,
      /^I'll analyze this step by step\.\.\./im,
      /^(First|Let's|To solve|To answer|Analyzing|Reasoning|Let me|I'll|I need to)/im,
      /^(Step \d+:|Step-by-step|First,|Let's start by)/im,
      // Final answer markers - content after these is likely the actual answer
      /(In conclusion:|To summarize:|In summary:|The answer is:|Therefore,|So,|Thus,)/im
    ];
    
    // Check if text has intermediate content patterns
    const hasIntermediatePatterns = intermediatePatterns.slice(0, 4).some(pattern => pattern.test(text));
    
    // Look for a "final answer" section
    const finalAnswerMatch = intermediatePatterns[4].exec(text);
    
    if (hasIntermediatePatterns && finalAnswerMatch) {
      // Calculate the position where the final answer begins
      const finalAnswerPos = finalAnswerMatch.index;
      
      // If there's substantial text before the final answer, consider it as thinking
      if (finalAnswerPos > 100) { // Only if there's meaningful content before
        const intermediateContent = text.substring(0, finalAnswerPos).trim();
        thoughts.push(intermediateContent);
        cleanedText = text.substring(finalAnswerPos).trim();
        hasIntermediateContent = true;
      }
    }
    
    // If the text is very long (>1000 chars) and no final answer pattern was found,
    // but we have intermediate patterns, try to identify the most "answer-like" part
    if (hasIntermediatePatterns && !finalAnswerMatch && text.length > 1000) {
      // Look for paragraph breaks in the latter half of the content
      const paragraphs = text.split(/\n\s*\n/);
      if (paragraphs.length > 1) {
        // Consider the first 70% as potentially intermediate content
        const splitPoint = Math.floor(paragraphs.length * 0.7);
        const potentialThinking = paragraphs.slice(0, splitPoint).join('\n\n');
        const potentialAnswer = paragraphs.slice(splitPoint).join('\n\n');
        
        if (potentialThinking.length > 200 && potentialAnswer.length > 100) {
          thoughts.push(potentialThinking);
          cleanedText = potentialAnswer;
          hasIntermediateContent = true;
        }
      }
    }
  }
  
  return {
    cleanedText: cleanedText.trim(),
    thoughts: thoughts.join('\n\n'),
    hasIntermediateContent
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
          // Initialize the Ollama client
          const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' });
          
          let fullResponse = "";
          // Disable streaming for Phi-4 model to prevent flooding messages
          const isPhiModel = modelConfig.model.toLowerCase().includes('phi');
          
          if (isPhiModel) {
            console.log(`Disabling streaming for ${modelConfig.model} to prevent message flooding`);
            // Use non-streaming mode for Phi models
            const result = await ollama.generate({
              model: modelConfig.model,
              prompt: processedPrompt,
              stream: false
            });
            
            fullResponse = result.response;
            
            // Parse final response
            const { cleanedText, thoughts, hasIntermediateContent } = extractThinking(fullResponse, modelConfig.model);
            
            // Important: For non-streaming Phi models, we need to explicitly send updates that 
            // match the structure the frontend expects
            if (onUpdate) {
              console.log('Sending non-streaming Phi model response updates:', { 
                responseLength: cleanedText.length,
                hasThinking: thoughts.length > 0 || hasIntermediateContent
              });
              
              // First, if we have thinking content, update that
              if (thoughts) {
                await onUpdate({
                  avatarId: avatar.id,
                  avatarName: avatar.name,
                  imageUrl: avatar.imageUrl || null,
                  thinkingContent: thoughts,
                  hasThinking: true,
                  response: "",
                  round
                });
              }
              
              // Then send the final response with the complete flag
              // This matches what the frontend expects in App.jsx onmessage handler
              await onUpdate({
                avatarId: avatar.id,
                avatarName: avatar.name,
                imageUrl: avatar.imageUrl || null,
                response: cleanedText,
                thinkingContent: thoughts,
                hasThinking: thoughts.length > 0 || hasIntermediateContent,
                isStreaming: false,
                complete: true,  // This is the key flag the frontend looks for
                round
              });
            }
            
            response = {
              responses: [{
                avatarId: avatar.id,
                avatarName: avatar.name,
                imageUrl: avatar.imageUrl || null,
                response: cleanedText,
                thinkingContent: thoughts,
                hasThinking: thoughts.length > 0 || hasIntermediateContent,
                isStreaming: false,
                round
              }]
            };
          } else {
            // For all other models, use streaming as before
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
                  const { cleanedText, thoughts, hasIntermediateContent } = extractThinking(fullResponse, modelConfig.model);
                  onUpdate({
                    avatarId: avatar.id,
                    avatarName: avatar.name,
                    imageUrl: avatar.imageUrl || null,
                    response: cleanedText,
                    thinkingContent: thoughts,
                    hasThinking: thoughts.length > 0 || hasIntermediateContent,
                    isStreaming: true,
                    round
                  });
                }
              }
            }

            // Parse final response
            const { cleanedText, thoughts, hasIntermediateContent } = extractThinking(fullResponse, modelConfig.model);
            response = {
              responses: [{
                avatarId: avatar.id,
                avatarName: avatar.name,
                imageUrl: avatar.imageUrl || null,
                response: cleanedText,
                thinkingContent: thoughts,
                hasThinking: thoughts.length > 0 || hasIntermediateContent,
                isStreaming: false,
                round
              }]
            };
          }
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