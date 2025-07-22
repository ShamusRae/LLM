'use strict';

const aiService = require('./ai/aiService');
const fileService = require('./fileService');
const modelService = require('./modelService');

async function getResponse(message, avatar, previousResponses = [], onUpdate, selectedFiles = []) {
  const { name, role, description, skills } = avatar;
  
  // NEW: Use model categories instead of specific models
  const modelCategory = avatar.modelCategory || avatar.selectedModel || 'General';
  
  // Resolve the actual model based on category (with offline preference if needed)
  const isOfflinePreferred = process.env.OFFLINE_MODE === 'true' || !process.env.OPENAI_API_KEY;
  let resolvedModelId;
  
  try {
    resolvedModelId = await modelService.resolveAvatarModel(avatar, isOfflinePreferred);
    console.log(`🎯 Resolved ${modelCategory} → ${resolvedModelId} for avatar ${name}`);
  } catch (error) {
    console.error(`❌ Model resolution failed for ${name}:`, error.message);
    resolvedModelId = 'openai:gpt-4-turbo-preview'; // Fallback
  }
  
  // Extract provider and model from resolved model ID  
  const [providerName, modelId] = resolvedModelId.split(':');

  if (!providerName || !modelId) {
    throw new Error(`Invalid resolved model format: ${resolvedModelId}`);
  }

  // 1. Construct the System Message / Prompt with conversation history
  let systemMessage = `You are ${name}, ${role}. ${description || ''}\nYour skills include: ${Array.isArray(skills) ? skills.join(", ") : skills}\n\n`;
  
  if (previousResponses && previousResponses.length > 0) {
    systemMessage += "Previous conversation in this chat session:\n";
    previousResponses.forEach((resp, index) => {
      if (resp.role === 'user') {
        systemMessage += `User: ${resp.content}\n`;
      } else if (resp.role === 'assistant') {
        systemMessage += `${resp.avatarName || 'Assistant'}: ${resp.content}\n`;
      } else if (resp.avatar && resp.message) {
        // Legacy format support
        systemMessage += `${resp.avatar}: ${resp.message}\n`;
      }
    });
    systemMessage += "\nPlease consider this conversation history when responding.\n\n";
  }

  // 2. Get available MCP tools and convert them to function definitions
  const { mcpServer } = require('./mcpService');
  let functionDefinitions = [];
  let hasTools = false;
  
  try {
    // Get enabled tools from avatar configuration or use all available tools
    const enabledTools = avatar.enabledTools || [];
    const availableTools = mcpServer.getAvailableTools();
    
    // If avatar has specific tools enabled, filter to those, otherwise use all
    const toolsToUse = enabledTools.length > 0 
      ? availableTools.filter(tool => enabledTools.includes(tool.id))
      : availableTools;
      
    if (toolsToUse.length > 0) {
      functionDefinitions = mcpServer.getFunctionDefinitions().filter(func => 
        toolsToUse.some(tool => tool.id === func.id)
      );
      hasTools = true;
      
      console.log(`Avatar ${name} has access to ${functionDefinitions.length} tools:`, 
        functionDefinitions.map(f => f.name));
    }
  } catch (error) {
    console.warn('Could not load MCP tools:', error.message);
  }

  // 3. Prepare the user's message, embedding file content if necessary
  let userMessage = message;
  if (selectedFiles && selectedFiles.length > 0) {
    let fileContent = "\n\nHere is the content of the selected files:\n";
    for (const file of selectedFiles) {
      const content = await fileService.getFileMarkdownContent(file.id);
      fileContent += `=== File: ${file.filename} ===\n${content}\n\n`;
    }
    userMessage += fileContent;
  }
  
  if (onUpdate) {
      onUpdate({
        response: `I'm thinking about your message...`,
        isThinking: true,
        thinkingContent: "Analyzing your request..."
      });
  }

  // 4. Try to get the correct AI provider with fallback logic
  const apiKey = providerName === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
  
  let provider, finalProviderName, finalModelId;
  try {
    provider = aiService.getProvider(providerName, apiKey);
    finalProviderName = providerName;
    finalModelId = modelId;
  } catch (error) {
    console.warn(`Provider ${providerName} not available: ${error.message}. Attempting fallback...`);
    
    // Try fallback to Ollama if available
    try {
      const availableProviders = await aiService.getAvailableProviders();
      if (availableProviders.ollama) {
        console.log('Falling back to Ollama provider');
        provider = aiService.getProvider('ollama');
        finalProviderName = 'ollama';
        finalModelId = process.env.OLLAMA_MODEL || 'qwq:latest';
        
        if (onUpdate) {
          onUpdate({
            response: `${providerName} is not available. Using local Ollama model instead...`,
            isThinking: true,
            thinkingContent: "Switching to local AI model..."
          });
        }
      } else {
        throw new Error('No AI providers available');
      }
    } catch (fallbackError) {
      console.error('All AI providers failed:', fallbackError);
      return {
        responses: [{
          avatarId: avatar.id,
          avatarName: name,
          response: `I'm sorry, I cannot respond right now. ${error.message}. Please check your API keys in settings or ensure Ollama is running for local AI.`,
          isThinking: false,
          error: true,
          errorType: 'provider_unavailable'
        }]
      };
    }
  }

  // 5. Generate the response using the provider
  try {
    const response = await provider.generateResponse(userMessage, {
      model: finalModelId,
      systemMessage: systemMessage,
      functionDefinitions: hasTools ? functionDefinitions : undefined, // Pass function definitions if tools are available
    });

    let responseText;
    if (finalProviderName === 'openai') {
      responseText = response.choices[0].message.content;
    } else if (finalProviderName === 'claude') {
      responseText = response.content[0].text;
    } else if (finalProviderName === 'ollama') {
      responseText = response.response;
    } else {
      responseText = 'Response received but in unexpected format';
    }

    if (onUpdate) {
      onUpdate({ response: responseText, isThinking: false });
    }

    // NEW: Check if escalation is suggested
    const escalationCheck = modelService.checkForEscalation(modelCategory, responseText);
    let escalationResponse = null;
    
    if (escalationCheck.shouldEscalate) {
      console.log(`🚀 Auto-escalation triggered: ${modelCategory} → ${escalationCheck.targetCategory}`);
      
      try {
        // Create escalated avatar with better model category
        const escalatedAvatar = {
          ...avatar,
          modelCategory: escalationCheck.targetCategory
        };
        
        // Get response from better model
        const escalatedResult = await getResponse(message, escalatedAvatar, previousResponses, (update) => {
          if (onUpdate && update.isThinking) {
            onUpdate({
              ...update,
              response: `🚀 Escalating to ${escalationCheck.targetCategory} model for better results... ${update.response}`,
              thinkingContent: `Auto-escalated from ${modelCategory} to ${escalationCheck.targetCategory}`
            });
          }
        }, selectedFiles);
        
        if (escalatedResult?.responses?.[0]?.response) {
          escalationResponse = {
            ...escalatedResult.responses[0],
            escalated: true,
            originalModel: resolvedModelId,
            escalatedFrom: modelCategory,
            escalatedTo: escalationCheck.targetCategory,
            escalationReason: escalationCheck.reason
          };
        }
      } catch (escalationError) {
        console.warn(`⚠️ Escalation failed: ${escalationError.message}, using original response`);
      }
    }

    return {
      responses: [{
        avatarId: avatar.id,
        avatarName: name,
        response: escalationResponse?.response || responseText,
        isThinking: false,
        provider: finalProviderName,
        model: escalationResponse?.model || finalModelId,
        category: escalationResponse?.escalatedTo || modelCategory,
        // Include escalation metadata
        ...(escalationResponse && {
          escalated: true,
          originalModel: resolvedModelId,
          escalatedFrom: modelCategory,
          escalatedTo: escalationResponse.escalatedTo,
          escalationReason: escalationResponse.escalationReason
        })
      }]
    };

  } catch (error) {
    console.error(`Error getting response from ${finalProviderName}:`, error);
    
    // If the error is about API key or authentication, provide helpful message
    if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return {
        responses: [{
          avatarId: avatar.id,
          avatarName: name,
          response: `I need a valid API key to access ${finalProviderName}. Please configure your ${finalProviderName.toUpperCase()}_API_KEY in settings.`,
          isThinking: false,
          error: true,
          errorType: 'authentication'
        }]
      };
    }
    
    // Generic error with suggestion
    return {
      responses: [{
        avatarId: avatar.id,
        avatarName: name,
        response: `I encountered an error: ${error.message}. You can try again or check if Ollama is running for local AI as a backup.`,
        isThinking: false,
        error: true,
        errorType: 'generation_error'
      }]
    };
  }
}

module.exports = {
  getResponse
};