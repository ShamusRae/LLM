'use strict';

const axios = require('axios');
const BaseProvider = require('./baseProvider');

class ClaudeProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.api = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes
    });
  }

  async generateResponse(prompt, options = {}) {
    const { model, systemMessage, functionDefinitions } = options;
    
    // Prepare Claude-compatible tools format from MCP function definitions
    let claudeTools = undefined;
    if (functionDefinitions && functionDefinitions.length > 0) {
      claudeTools = functionDefinitions.map(func => ({
        name: func.name,
        description: func.description,
        input_schema: func.parameters
      }));
    }
    
    const requestBody = {
      model: model,
      system: systemMessage,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      tools: claudeTools
    };

    try {
      const response = await this.api.post('/messages', requestBody);
      
      // Handle tool use if Claude made any
      if (response.data.content && response.data.content.some(content => content.type === 'tool_use')) {
        const { mcpServer } = require('../mcpService');
        let toolResults = [];
        
        // Process each content block to handle tool use
        for (const content of response.data.content) {
          if (content.type === 'tool_use') {
            try {
              console.log(`Claude model calling function: ${content.name} with args:`, content.input);
              
              // Execute the function through MCP server
              const result = await mcpServer.executeFunction(content.name, content.input);
              
              toolResults.push({
                type: "tool_result",
                tool_use_id: content.id,
                content: JSON.stringify(result)
              });
            } catch (error) {
              console.error(`Error executing function ${content.name}:`, error);
              toolResults.push({
                type: "tool_result",
                tool_use_id: content.id,
                content: JSON.stringify({ error: error.message })
              });
            }
          }
        }
        
        // If we have tool results, make a follow-up request
        if (toolResults.length > 0) {
          const followUpRequestBody = {
            model: model,
            system: systemMessage,
            messages: [
              { role: 'user', content: prompt },
              { role: 'assistant', content: response.data.content },
              { role: 'user', content: toolResults }
            ],
            max_tokens: 4096
          };
          
          const followUpResponse = await this.api.post('/messages', followUpRequestBody);
          return followUpResponse.data;
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error from Claude API:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to get response from Claude.');
    }
  }
  
  async generateImage(prompt, options = {}) {
    // Claude does not currently support image generation.
    return Promise.reject(new Error('Image generation is not supported by this provider.'));
  }

  static async getAvailableModels() {
    // Anthropic does not have a public endpoint to list models,
    // so we'll return a hardcoded list of popular models.
    return [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3.5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ];
  }
}

module.exports = ClaudeProvider; 