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
    
    // Prepare OpenAI-compatible tools format from MCP function definitions
    let openaiTools = tools;
    if (functionDefinitions && functionDefinitions.length > 0) {
      openaiTools = functionDefinitions.map(func => ({
        type: "function",
        function: {
          name: func.name,
          description: func.description,
          parameters: func.parameters
        }
      }));
    }
    
    const requestBody = {
      model: model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      tools: openaiTools,
      tool_choice: toolChoice || (openaiTools && openaiTools.length > 0 ? "auto" : undefined)
    };

    try {
      const response = await this.api.post('/chat/completions', requestBody);
      const responseMessage = response.data.choices[0].message;
      
      // Handle function calls if the model made any
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const { mcpServer } = require('../mcpService');
        let functionResults = [];
        
        for (const toolCall of responseMessage.tool_calls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            console.log(`OpenAI model calling function: ${functionName} with args:`, functionArgs);
            
            // Execute the function through MCP server
            const result = await mcpServer.executeFunction(functionName, functionArgs);
            
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
        const followUpRequestBody = {
          model: model,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
            responseMessage, // Include the assistant's message with tool calls
            ...functionResults // Include all function results
          ],
          temperature: 0.7,
          max_tokens: 4096
        };
        
        const followUpResponse = await this.api.post('/chat/completions', followUpRequestBody);
        return followUpResponse.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error from OpenAI API:', error.response?.data || error.message);
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
    if (!apiKey) return [];
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return response.data.data.filter(model => model.id.includes('gpt'));
    } catch (error) {
      console.error('Error fetching OpenAI models:', error.message);
      return [];
    }
  }
}

module.exports = OpenAIProvider; 