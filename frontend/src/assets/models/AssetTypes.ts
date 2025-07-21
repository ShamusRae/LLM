/**
 * Asset Types
 * 
 * Shared types and interfaces for the asset system.
 * These are used across different asset executors and components.
 */

// Standard input/output types for assets
export type AssetInput = {
  type: 'markdown' | 'json';
  content: string | object;
  metadata?: Record<string, any>;
};

export type AssetOutput = {
  type: 'markdown' | 'json';
  content: string | object;
  metadata?: Record<string, any>;
  error?: string;
};

// Interface for asset execution context
export interface AssetExecutionContext {
  nodeId: string;
  nodeType: string;
  nodeData: any;
  inputs: AssetInput[];
  flowId?: string;
}

// Abstract base class for all asset executors
export abstract class AssetExecutor {
  abstract execute(context: AssetExecutionContext): Promise<AssetOutput>;
  abstract getInputType(): 'markdown' | 'json' | 'both';
  abstract getOutputType(): 'markdown' | 'json' | 'both';
}

// File types for asset classification
export const FILE_TYPES = {
  ANY: 'any',
  PDF: 'pdf',
  WORD: 'word',
  EXCEL: 'excel',
  CSV: 'csv',
  TXT: 'txt',
};

// Get file type display name
export const getFileTypeName = (fileType: string): string => {
  switch (fileType) {
    case FILE_TYPES.ANY:
      return 'Any File';
    case FILE_TYPES.PDF:
      return 'PDF Document';
    case FILE_TYPES.WORD:
      return 'Word Document';
    case FILE_TYPES.EXCEL:
      return 'Excel Spreadsheet';
    case FILE_TYPES.CSV:
      return 'CSV File';
    case FILE_TYPES.TXT:
      return 'Text File';
    default:
      return 'File';
  }
}; 