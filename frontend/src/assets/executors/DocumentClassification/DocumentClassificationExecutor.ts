/**
 * Document Classification Executor
 * 
 * Handles the execution of document classification assets.
 * Uses an LLM to classify documents based on their content.
 */

import { AssetExecutor, AssetExecutionContext, AssetOutput } from '../../models/AssetTypes';
import { LLMService } from '../../../services/llmService';

class DocumentClassificationExecutor extends AssetExecutor {
  private llmService: LLMService;
  
  constructor(llmService: LLMService) {
    super();
    this.llmService = llmService;
  }
  
  getInputType() {
    return 'both' as const;
  }
  
  getOutputType() {
    return 'json' as const;
  }
  
  async execute(context: AssetExecutionContext): Promise<AssetOutput> {
    // Get the first section of the file content from the input
    const input = context.inputs[0];
    const fileContent = typeof input.content === 'string' 
      ? input.content 
      : JSON.stringify(input.content);
    
    // Sample document types from the node data
    const { structuredTypes, unstructuredTypes, hybridTypes } = context.nodeData;
    const allTypes = [...structuredTypes, ...unstructuredTypes, ...hybridTypes];
    
    // Construct a prompt for the LLM
    const prompt = `
      Analyze the following file content and classify it into one of these document types:
      ${allTypes.join(', ')}
      
      If none of these types match, respond with the most appropriate document type.
      
      File content (first section):
      ${fileContent.substring(0, 1500)}
      
      Return JSON in this format:
      {
        "documentType": "the determined document type",
        "confidence": 0.8, // 0-1 confidence score
        "categories": ["structured"|"unstructured"|"hybrid"],
        "explanation": "Brief explanation of classification"
      }
    `;
    
    try {
      // Call LLM service with the prompt
      const response = await this.llmService.generateText(prompt, {
        model: 'gpt-4',
        temperature: 0.1,
        responseFormat: { type: 'json_object' }
      });
      
      // Parse the response
      const result = JSON.parse(response);
      
      return {
        type: 'json',
        content: result,
        metadata: {
          nodeId: context.nodeId,
          nodeType: context.nodeType,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        type: 'json',
        content: { documentType: 'unknown', confidence: 0, categories: [] },
        error: `Classification failed: ${errorMessage}`,
        metadata: {
          nodeId: context.nodeId,
          nodeType: context.nodeType,
          timestamp: new Date().toISOString(),
          error: true
        }
      };
    }
  }
}

export default DocumentClassificationExecutor; 