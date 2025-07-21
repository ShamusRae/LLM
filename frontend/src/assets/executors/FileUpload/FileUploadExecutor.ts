/**
 * File Upload Executor
 * 
 * Handles the execution of file upload assets.
 * Supports both interactive (UI-based) and automated execution modes.
 */

import { AssetExecutor, AssetExecutionContext, AssetOutput } from '../../models/AssetTypes';

class FileUploadExecutor extends AssetExecutor {
  getInputType() {
    return 'json' as const;
  }
  
  getOutputType() {
    return 'json' as const;
  }
  
  async execute(context: AssetExecutionContext): Promise<AssetOutput> {
    // For file upload, we'll rely on UI interaction
    // The execute method is only used for non-interactive scenarios
    // or when files have already been selected
    
    // If we already have selected files in the input, process them
    if (context.inputs && context.inputs.length > 0 && context.inputs[0].content) {
      const fileList = context.inputs[0].content;
      return {
        type: 'json',
        content: {
          files: Array.isArray(fileList) ? fileList : [],
          totalFiles: Array.isArray(fileList) ? fileList.length : 0,
          configuration: context.nodeData.config || {},
        },
        metadata: {
          nodeId: context.nodeId,
          nodeType: context.nodeType,
          timestamp: new Date().toISOString(),
        }
      };
    }
    
    // For interactive mode, return a placeholder that will be replaced
    // by the actual file selection from the UI component
    return {
      type: 'json',
      content: {
        requiresInteraction: true,
        message: 'This asset requires user interaction to select files',
        configuration: context.nodeData.config || {}
      },
      metadata: {
        nodeId: context.nodeId,
        nodeType: context.nodeType,
        interactionRequired: true,
        timestamp: new Date().toISOString(),
      }
    };
  }
}

export default FileUploadExecutor; 