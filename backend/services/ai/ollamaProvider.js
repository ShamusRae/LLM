'use strict';

const axios = require('axios');
const BaseProvider = require('./baseProvider');

class OllamaProvider extends BaseProvider {
  constructor() {
    super(); // No API key needed for local Ollama
    this.api = axios.create({
      baseURL: 'http://127.0.0.1:11434/api',
      timeout: 300000, // 5 minutes
    });
  }

  async generateResponse(prompt, options = {}) {
    const { model, systemMessage } = options;
    const requestBody = {
      model: model,
      prompt: prompt,
      system: systemMessage,
      stream: false, // For simplicity, we'll handle non-streamed responses first
    };

    try {
      const response = await this.api.post('/generate', requestBody);
      return response.data;
    } catch (error) {
      console.error('Error from Ollama API:', error.response?.data || error.message);
      throw new Error('Failed to get response from Ollama. Is it running?');
    }
  }
  
  async generateImage(prompt, options = {}) {
    // Ollama does not support image generation directly in its main API.
    return Promise.reject(new Error('Image generation is not supported by this provider.'));
  }

  static async getAvailableModels() {
    try {
      const response = await axios.get('http://127.0.0.1:11434/api/tags');
      return response.data.models.map(model => ({ id: model.name, name: model.name }));
    } catch (error) {
      // If we can't connect to Ollama, it's likely not running.
      // We'll return an empty array instead of throwing an error.
      console.warn('Could not connect to Ollama to fetch models. Is it running?');
      return [];
    }
  }
}

module.exports = OllamaProvider; 