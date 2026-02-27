// Purpose: Unit tests for agentRunner response normalization and run flow.
// Author: LLM Chat, Last Modified: 2025-02-26

const { describe, test, expect } = require('@jest/globals');
const { runAgent, extractResponseText } = require('../../services/ai/agentRunner');

describe('agentRunner', () => {
  describe('extractResponseText', () => {
    test('extracts OpenAI response content', () => {
      const text = extractResponseText('openai', {
        choices: [{ message: { content: 'openai text' } }]
      });
      expect(text).toBe('openai text');
    });

    test('extracts Claude response content', () => {
      const text = extractResponseText('claude', {
        content: [{ text: 'claude text' }]
      });
      expect(text).toBe('claude text');
    });

    test('extracts Ollama response content', () => {
      const text = extractResponseText('ollama', { response: 'ollama text' });
      expect(text).toBe('ollama text');
    });

    test('returns empty string for unsupported provider', () => {
      const text = extractResponseText('unknown', {});
      expect(text).toBe('');
    });
  });

  describe('runAgent', () => {
    test('calls provider.generateResponse with unified options', async () => {
      const provider = {
        generateResponse: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'hello world' } }]
        })
      };

      const result = await runAgent({
        provider,
        providerName: 'openai',
        modelId: 'gpt-4',
        userMessage: 'hello',
        systemMessage: 'system message',
        functionDefinitions: [{ name: 'test_tool', parameters: {} }]
      });

      expect(provider.generateResponse).toHaveBeenCalledWith('hello', {
        model: 'gpt-4',
        systemMessage: 'system message',
        functionDefinitions: [{ name: 'test_tool', parameters: {} }]
      });
      expect(result.responseText).toBe('hello world');
      expect(result.rawResponse).toBeDefined();
    });

    test('omits functionDefinitions when empty', async () => {
      const provider = {
        generateResponse: jest.fn().mockResolvedValue({ response: 'ok' })
      };

      await runAgent({
        provider,
        providerName: 'ollama',
        modelId: 'llama3.2',
        userMessage: 'hello',
        systemMessage: 'system message',
        functionDefinitions: []
      });

      expect(provider.generateResponse).toHaveBeenCalledWith('hello', {
        model: 'llama3.2',
        systemMessage: 'system message',
        functionDefinitions: undefined
      });
    });
  });
});

