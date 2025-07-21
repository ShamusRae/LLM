/**
 * Assets Module Index
 * 
 * This is the main entry point for the assets module.
 * It exports all the types, executors, components, and services.
 */

// Export asset types and interfaces
export * from './models/AssetTypes';

// Export asset executors
export { default as FileUploadExecutor } from './executors/FileUpload/FileUploadExecutor';
export { default as DocumentClassificationExecutor } from './executors/DocumentClassification/DocumentClassificationExecutor';
export { default as DataTransformationExecutor } from './executors/DataTransformation/DataTransformationExecutor';

// Export asset executor components
export { default as FileUploadExecutorComponent } from './executors/FileUpload/FileUploadExecutorComponent';

// Export the main asset execution service
export { default as AssetExecutionService } from './AssetExecutionService';

// Default export for the main service
export { default } from './AssetExecutionService'; 