/**
 * LLM Service
 * 
 * Service for interacting with Language Learning Models (LLMs)
 * Provides methods for text generation, function calling, and other LLM-related features
 */

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  responseFormat?: {
    type: 'text' | 'json_object';
  };
  // Add other LLM parameters as needed
}

export interface LLMFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export class LLMService {
  private apiEndpoint: string;
  private defaultModel: string;

  constructor(apiEndpoint = '/api/llm', defaultModel = 'gpt-4') {
    this.apiEndpoint = apiEndpoint;
    this.defaultModel = defaultModel;
  }

  /**
   * Generate text using an LLM
   * @param prompt The prompt to send to the LLM
   * @param options LLM configuration options
   * @returns The generated text
   */
  async generateText(prompt: string, options: LLMOptions = {}): Promise<string> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: options.model || this.defaultModel,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          stop: options.stopSequences,
          response_format: options.responseFormat,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`LLM API error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('Error generating text from LLM:', error);
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate text with function calling capability
   * @param systemPrompt System instructions for the LLM
   * @param userPrompt User prompt/question
   * @param functions Available functions that the LLM can call
   * @param options LLM configuration options
   * @returns The generated response or function call results
   */
  async generateTextWithFunctions(
    systemPrompt: string,
    userPrompt: string,
    functions: LLMFunction[],
    options: LLMOptions = {}
  ): Promise<string | object> {
    try {
      const response = await fetch(`${this.apiEndpoint}/functions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: systemPrompt,
          user: userPrompt,
          functions,
          model: options.model || this.defaultModel,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`LLM API error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Check if the result is a function call that was executed
      if (data.function_call && data.function_result) {
        return data.function_result;
      }
      
      return data.text || '';
    } catch (error) {
      console.error('Error generating text with functions from LLM:', error);
      throw new Error(`Failed to generate text with functions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 