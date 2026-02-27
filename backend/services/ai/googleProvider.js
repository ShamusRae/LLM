// Purpose: Google Gemini provider for text generation and model discovery.
// Author: LLM Chat, Last Modified: 2026-02-26
'use strict';

const axios = require('axios');
const BaseProvider = require('./baseProvider');

class GoogleProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.api = axios.create({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      timeout: 300000
    });
  }

  async generateResponse(prompt, options = {}) {
    const { model = 'gemini-2.5-flash', systemMessage } = options;
    const mergedPrompt = systemMessage ? `${systemMessage}\n\n${prompt}` : prompt;

    const payload = {
      contents: [
        {
          parts: [{ text: mergedPrompt }]
        }
      ]
    };

    try {
      const response = await this.api.post(
        `/models/${model}:generateContent`,
        payload,
        { params: { key: this.apiKey } }
      );
      return response.data;
    } catch (error) {
      console.error('Error from Google Gemini API:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to get response from Google Gemini.');
    }
  }

  async generateImage() {
    return Promise.reject(new Error('Image generation is not supported by this provider.'));
  }

  static async getAvailableModels(apiKey) {
    const knownModels = [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
    ];

    if (!apiKey) {
      return knownModels;
    }

    try {
      const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
        params: { key: apiKey },
        timeout: 10000
      });

      const apiModels = (response.data?.models || [])
        .map((model) => model?.name?.replace('models/', ''))
        .filter((modelId) => typeof modelId === 'string' && modelId.includes('gemini'))
        .map((modelId) => ({ id: modelId, name: modelId }));

      const merged = [...knownModels];
      apiModels.forEach((model) => {
        if (!merged.some((known) => known.id === model.id)) {
          merged.push(model);
        }
      });

      return merged;
    } catch (error) {
      console.warn('Google model discovery failed, using known list:', error.message);
      return knownModels;
    }
  }
}

module.exports = GoogleProvider;
