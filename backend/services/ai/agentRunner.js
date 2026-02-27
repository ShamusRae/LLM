// Purpose: Unified runner for provider execution and response normalization.
// Author: LLM Chat, Last Modified: 2025-02-26
'use strict';

/**
 * Normalize provider-specific response payload into plain text.
 * @param {string} providerName
 * @param {Object} response
 * @returns {string}
 */
function extractResponseText(providerName, response) {
  if (providerName === 'openai') {
    return response?.choices?.[0]?.message?.content || '';
  }
  if (providerName === 'claude') {
    return response?.content?.[0]?.text || '';
  }
  if (providerName === 'google') {
    return response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  if (providerName === 'ollama') {
    return response?.response || '';
  }
  return '';
}

/**
 * Run one provider call with shared options and normalize output.
 * @param {Object} params
 * @param {Object} params.provider
 * @param {string} params.providerName
 * @param {string} params.modelId
 * @param {string} params.userMessage
 * @param {string} params.systemMessage
 * @param {Array<Object>} [params.functionDefinitions]
 * @returns {Promise<{responseText: string, rawResponse: Object}>}
 */
async function runAgent(params) {
  const {
    provider,
    providerName,
    modelId,
    userMessage,
    systemMessage,
    functionDefinitions
  } = params;

  const rawResponse = await provider.generateResponse(userMessage, {
    model: modelId,
    systemMessage,
    functionDefinitions: functionDefinitions?.length ? functionDefinitions : undefined
  });

  const responseText = extractResponseText(providerName, rawResponse);
  return { responseText, rawResponse };
}

module.exports = {
  runAgent,
  extractResponseText
};

