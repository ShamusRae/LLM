'use strict';

const axios = require('axios');
const BaseProvider = require('./baseProvider');

class OpenAIProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.api = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes
    });
  }

  async generateResponse(prompt, options = {}) {
    const { model, systemMessage, toolChoice, tools, functionDefinitions } = options;
    
    // Check if this is an o3/o4 model that has specific requirements
    const isO3O4Series = model && (model.includes('o3') || model.includes('o4'));
    
    // Process the messages to ensure they are valid
    let messages = [];
    
    // o3/o4 models don't support system messages - integrate into user prompt
    if (isO3O4Series) {
      const enhancedPrompt = systemMessage 
        ? `${systemMessage}\n\n---\n\n${prompt}`
        : prompt;
      messages.push({ role: 'user', content: enhancedPrompt });
      console.log(`🧠 Using o3/o4-series model ${model} - system message integrated, default temperature`);
    } else {
      // Standard models support system messages
      if (systemMessage) {
        messages.push({ role: 'system', content: systemMessage });
      }
      messages.push({ role: 'user', content: prompt });
    }
    
    // Ensure prompt is not null or empty
    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt cannot be null or empty');
    }

    // 🌐 INTERNET ACCESS: Convert function definitions to OpenAI tools format
    let openaiTools = null;
    let finalToolChoice = null;
    
    if (options.functionDefinitions && Array.isArray(options.functionDefinitions) && options.functionDefinitions.length > 0) {
      console.log(`🔧 OPENAI: Converting ${options.functionDefinitions.length} function definitions to OpenAI tools format`);
      
      openaiTools = options.functionDefinitions.map(func => ({
        type: "function",
        function: {
          name: func.name,
          description: func.description,
          parameters: func.parameters
        }
      }));
      
      finalToolChoice = "auto"; // Let the model decide when to use tools
      console.log(`🌐 OPENAI: Enabled ${openaiTools.length} internet tools for real data access`);
    }
    
    // Adjust parameters based on model capabilities
    let maxTokensParam = 'max_tokens';
    let maxTokens = 4096;
    let temperature = 0.7; // Default temperature
    
    if (isO3O4Series) {
      maxTokensParam = 'max_completion_tokens'; // o3/o4 models use different parameter
      maxTokens = 32000; // High limit to allow for internal reasoning + actual response
      temperature = 1.0; // o3/o4 models only support default temperature
      console.log(`🧠 o3/o4 model detected: using ${maxTokensParam}=${maxTokens}, temperature=${temperature}`);
    } else if (model && model.includes('gpt-4.1')) {
      maxTokens = 8000; // GPT-4.1 higher limits
    }
    
    const requestBody = {
      model: model,
      messages: messages,
      temperature: temperature, // Use model-specific temperature
      [maxTokensParam]: maxTokens, // Use dynamic parameter name
      tools: openaiTools,
      tool_choice: finalToolChoice || toolChoice
    };

    // Remove undefined fields to avoid API errors
    if (!openaiTools) {
      delete requestBody.tools;
      delete requestBody.tool_choice;
    }

    try {
      console.log(`🚀 Calling OpenAI API with model: ${model}`);
      const response = await this.api.post('/chat/completions', requestBody);
      const responseMessage = response.data.choices[0].message;
      
      // Handle function calls if the model made any
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const mcpBridge = require('../mcpBridge');
        let functionResults = [];
        
        for (const toolCall of responseMessage.tool_calls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            console.log(`OpenAI model calling function: ${functionName} with args:`, functionArgs);
            
            // Execute the function through MCP server
            const result = await mcpBridge.executeFunction(functionName, functionArgs);
            
            functionResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify(result)
            });
          } catch (error) {
            console.error(`Error executing function ${toolCall.function.name}:`, error);
            functionResults.push({
              tool_call_id: toolCall.id,
              role: "tool", 
              name: toolCall.function.name,
              content: JSON.stringify({ error: error.message })
            });
          }
        }
        
        // Make a follow-up request with the function results
        const followUpMessages = [
          ...messages,
          responseMessage, // Include the assistant's message with tool calls
          ...functionResults // Include all function results
        ];
        
        const followUpRequestBody = {
          model: model,
          messages: followUpMessages,
          temperature: isO3O4Series ? 1.0 : 0.7, // o3/o4 only support temperature 1.0
          [maxTokensParam]: maxTokens // Use correct parameter name based on model
        };
        
        const followUpResponse = await this.api.post('/chat/completions', followUpRequestBody);
        return followUpResponse.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error from OpenAI API:', error.response?.data || error.message);
      
      // Enhanced error handling for o3 models with intelligent fallback
      if (isO3O4Series && error.response?.status === 400) {
        console.log(`⚠️ o3-series model ${model} not yet available in API - falling back to GPT-4.1`);
        
        // Intelligent fallback: o3 -> gpt-4.1, o3-mini -> gpt-4.1
        const fallbackModel = model.includes('mini') ? 'gpt-4.1-mini' : 'gpt-4.1';
        console.log(`🔄 Fallback: ${model} → ${fallbackModel}`);
        
        // Retry with fallback model
        const fallbackRequestBody = {
          ...requestBody,
          model: fallbackModel,
          max_tokens: 4096 // Standard GPT-4 limits
        };
        
        try {
          const fallbackResponse = await this.api.post('/chat/completions', fallbackRequestBody);
          console.log(`✅ Fallback successful: ${fallbackModel} handled the request`);
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error(`❌ Fallback to ${fallbackModel} also failed:`, fallbackError.message);
        }
      }
      
      throw new Error(error.response?.data?.error?.message || 'Failed to get response from OpenAI.');
    }
  }

  async generateImage(prompt, options = {}) {
     const { model = 'dall-e-3', size = '1024x1024', quality = 'standard', style = 'natural' } = options;
    try {
      const response = await this.api.post('/images/generations', {
        model,
        prompt,
        n: 1,
        size,
        quality,
        style,
      });
      return response.data?.data?.[0]?.url;
    } catch (error) {
      console.error('Error from DALL-E API:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to generate image.');
    }
  }

  static async getAvailableModels(apiKey) {
    if (!apiKey) {
      // Return static list of known OpenAI models when no API key
      return [
        { id: 'gpt-5.2', name: 'GPT-5.2' },
        { id: 'gpt-5.2-mini', name: 'GPT-5.2 Mini' },
        { id: 'o4-mini', name: 'o4-mini' },
        { id: 'o3', name: 'o3' },
        { id: 'gpt-4.1', name: 'GPT-4.1' }
      ];
    }

    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 10000 // 10 second timeout
      });

      // Filter and prioritize OpenAI models.
      const allModels = response.data.data
        .filter(model => 
          model.id.includes('gpt') || 
          model.id.includes('o3') || 
          model.id.includes('o4') ||
          model.id.includes('o1')
        )
        .map(model => ({
          id: model.id,
          name: model.id
        }));

      // Add known models that might not appear in API response yet
      const knownModels = [
        { id: 'gpt-5.2', name: 'GPT-5.2' },
        { id: 'gpt-5.2-mini', name: 'GPT-5.2 Mini' },
        { id: 'o4-mini', name: 'o4-mini' },
        { id: 'o3', name: 'o3' },
        { id: 'gpt-4.1', name: 'GPT-4.1' }
      ];

      // Merge with API models, avoiding duplicates
      const mergedModels = [...knownModels];
      allModels.forEach(apiModel => {
        if (!mergedModels.some(known => known.id === apiModel.id)) {
          mergedModels.push(apiModel);
        }
      });

      console.log(`✅ Found ${mergedModels.length} OpenAI models including o3/o4 series`);
      return mergedModels;

    } catch (error) {
      console.error('Error fetching OpenAI models:', error.message);
      
      // Return fallback list with o3/o4 models
      console.log('🔄 Using fallback OpenAI model list including o3/o4 series');
      return [
        { id: 'gpt-5.2', name: 'GPT-5.2' },
        { id: 'gpt-5.2-mini', name: 'GPT-5.2 Mini' },
        { id: 'o4-mini', name: 'o4-mini' },
        { id: 'o3', name: 'o3' },
        { id: 'gpt-4.1', name: 'GPT-4.1' }
      ];
    }
  }
}

module.exports = OpenAIProvider; 