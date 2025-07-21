/**
 * Data Transformation Executor
 * 
 * Handles the execution of data transformation assets.
 * Uses an LLM with function access for complex transformations.
 */

import { AssetExecutor, AssetExecutionContext, AssetOutput } from '../../models/AssetTypes';
import { LLMService } from '../../../services/llmService';

class DataTransformationExecutor extends AssetExecutor {
  private llmService: LLMService;
  
  constructor(llmService: LLMService) {
    super();
    this.llmService = llmService;
  }
  
  getInputType() {
    return 'both' as const;
  }
  
  getOutputType() {
    return 'both' as const;
  }
  
  async execute(context: AssetExecutionContext): Promise<AssetOutput> {
    const { inputFormat, outputFormat, transformations } = context.nodeData;
    const input = context.inputs[0];
    
    // Convert input to string if it's JSON
    const inputContent = typeof input.content === 'string' 
      ? input.content 
      : JSON.stringify(input.content, null, 2);
    
    // Build system prompt based on transformation configuration
    const systemPrompt = `
      You are an expert data transformation system. You will:
      1. Receive ${inputFormat} content
      2. Apply these transformations: ${transformations.join(', ')}
      3. Output the result in ${outputFormat} format
      
      Maintain data integrity and accuracy throughout the transformation process.
    `;
    
    // User prompt containing the actual content to transform
    const userPrompt = `
      Transform this ${inputFormat} content to ${outputFormat}:
      
      ${inputContent}
      
      Apply these specific transformations:
      ${this.getTransformationInstructions(transformations)}
    `;
    
    try {
      const response = await this.llmService.generateTextWithFunctions(
        systemPrompt,
        userPrompt,
        this.getTransformationFunctions(transformations)
      );
      
      // Determine output type based on configuration
      const outputType = outputFormat === 'json' ? 'json' : 'markdown';
      
      // If JSON output is expected, parse the response
      const content = outputType === 'json' && typeof response === 'string'
        ? JSON.parse(response)
        : response;
      
      return {
        type: outputType,
        content,
        metadata: {
          nodeId: context.nodeId,
          nodeType: context.nodeType,
          transformations,
          inputFormat,
          outputFormat,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        type: 'markdown',
        content: `Error during data transformation: ${errorMessage}`,
        error: errorMessage,
        metadata: {
          nodeId: context.nodeId,
          nodeType: context.nodeType,
          timestamp: new Date().toISOString(),
          error: true
        }
      };
    }
  }
  
  private getTransformationInstructions(transformations: string[]): string {
    // Map transformation types to specific instructions
    const instructionsMap: Record<string, string> = {
      'clean': 'Remove null values, standardize formatting, and fix common data issues.',
      'map_cdm': 'Map fields to our Common Data Model schema.',
      'coa_mapping': 'Map chart of accounts to the standard format specified in the configuration.',
      'subledger_mapping': 'Map sub-ledger entries according to the specified configuration.'
    };
    
    return transformations
      .map(t => instructionsMap[t] || `Apply ${t} transformation.`)
      .join('\n');
  }
  
  private getTransformationFunctions(transformations: string[]): any[] {
    // Return relevant function definitions based on transformation types
    // This is a simplified example - real implementation would have more complex functions
    return [
      {
        name: 'cleanData',
        description: 'Cleans and standardizes data by removing nulls and fixing formatting',
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'string',
              description: 'The data to clean'
            }
          },
          required: ['data']
        }
      },
      {
        name: 'mapToSchema',
        description: 'Maps data to a specific schema',
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'string',
              description: 'The data to map'
            },
            schema: {
              type: 'string',
              description: 'The schema to map to'
            }
          },
          required: ['data', 'schema']
        }
      }
    ];
  }
}

export default DataTransformationExecutor; 