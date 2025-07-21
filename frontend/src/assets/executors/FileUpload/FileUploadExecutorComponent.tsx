import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
} from '@mui/material';
import { 
  Upload as UploadIcon, 
  Check as CheckIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as SpreadsheetIcon,
} from '@mui/icons-material';
import FileList from '../../../components/FileList';
import { AssetOutput } from '../../models/AssetTypes';
import { getFileTypeName } from '../../models/AssetTypes';
import axios from 'axios';

interface FileUploadExecutorComponentProps {
  nodeData: any;
  onResult: (output: AssetOutput) => void;
  executing: boolean;
}

// File type icon mapping
const getFileTypeIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case 'application/pdf':
      return <PdfIcon />;
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return <DocIcon />;
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'text/csv':
      return <SpreadsheetIcon />;
    default:
      return <FileIcon />;
  }
};

// API Base URL
const API_BASE = 'http://localhost:3001';

/**
 * Component for executing the File Upload asset
 * Reuses the existing FileList component from the chat interface
 */
const FileUploadExecutorComponent: React.FC<FileUploadExecutorComponentProps> = ({
  nodeData,
  onResult,
  executing,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [executed, setExecuted] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [processedFiles, setProcessedFiles] = useState<any[]>([]);
  const fileListRef = useRef<{ clearSelection: () => void }>(null);

  // Process selected files with MarkItDown for complex file types
  const processSelectedFiles = async (files: any[], retryCount = 2) => {
    if (!files || files.length === 0) return [];
    
    setProcessing(true);
    
    try {
      console.log(`Starting to process ${files.length} files`);
      const processedResults = [];
      
      for (const file of files) {
        try {
          // Check if the file needs processing
          const needsProcessing = ['application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type);
          
          if (needsProcessing) {
            console.log(`Processing file ${file.id} (${file.filename}) with MarkItDown`);
            
            try {
              // Call MarkItDown API to process the file with the correct base URL
              const response = await axios.post(`${API_BASE}/api/file/${file.id}/process`, {
                options: { extractAll: true }
              });
              
              if (response.data && response.data.processedFile) {
                console.log(`File ${file.id} processed successfully`);
                processedResults.push({
                  ...file,
                  processedId: response.data.processedFile.id,
                  processedContent: response.data.processedFile.content,
                  processedType: 'markdown'
                });
              } else {
                console.warn(`File ${file.id} processing returned unexpected response`, response.data);
                processedResults.push(file);
              }
            } catch (error) {
              console.error(`Error processing file ${file.id}:`, error);
              
              // Try to get specific error details
              let errorMessage = "Unknown processing error";
              if (axios.isAxiosError(error) && error.response) {
                errorMessage = `Server error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`;
                console.error(`Server error response:`, error.response.data);
              }
              
              // Add error info to the file
              processedResults.push({
                ...file,
                processingError: errorMessage
              });
            }
          } else {
            console.log(`Skipping processing for file ${file.id} (${file.filename}) - type ${file.type} doesn't need processing`);
            processedResults.push(file);
          }
        } catch (fileError) {
          console.error(`Error handling file ${file.id || 'unknown'}:`, fileError);
          // Still include the file with error info
          processedResults.push({
            ...file,
            processingError: fileError instanceof Error ? fileError.message : String(fileError)
          });
        }
      }
      
      setProcessedFiles(processedResults);
      console.log(`Completed processing ${processedResults.length} files`);
      return processedResults;
      
    } catch (error) {
      console.error('Error during file processing:', error);
      
      // Retry logic for general errors
      if (retryCount > 0) {
        console.log(`Retrying file processing (${retryCount} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return processSelectedFiles(files, retryCount - 1);
      }
      
      // If we're out of retries, just return the original files
      return files.map(file => ({
        ...file,
        processingError: 'Failed to process after multiple attempts'
      }));
    } finally {
      setProcessing(false);
    }
  };

  // When files are selected, process them based on the node configuration
  useEffect(() => {
    const handleFileSelection = async () => {
      if (executing && !executed && selectedFiles.length > 0 && !processing) {
        // Start processing
        setProcessing(true);
        
        try {
          console.log(`Processing ${selectedFiles.length} selected files`, selectedFiles);
          
          // Process the files
          const processed = await processSelectedFiles(selectedFiles);
          
          // Create a standardized output based on the selected files
          const output: AssetOutput = {
            type: 'json',
            content: {
              files: processed.map(file => ({
                id: file.id,
                name: file.filename,
                type: file.type,
                size: file.size,
                url: file.url || `/api/file/${file.id}`,
                uploadDate: file.uploadDate,
                ...(file.processedId ? {
                  processedId: file.processedId,
                  processedType: file.processedType
                } : {})
              })),
              totalFiles: processed.length,
              configuration: nodeData.config || {},
            },
            metadata: {
              nodeId: nodeData.id,
              nodeType: 'fileupload',
              timestamp: new Date().toISOString(),
              fileTypes: processed.map(file => file.type),
              processingDuration: Date.now() - executeStartTime
            }
          };

          // Pass the result back to the parent component
          onResult(output);
          setExecuted(true);
        } catch (error) {
          console.error('Error processing selected files:', error);
          // Return error result
          onResult({
            type: 'json',
            content: { 
              files: [], 
              message: 'Error processing files',
              error: error instanceof Error ? error.message : String(error)
            },
            error: `Error processing files: ${error instanceof Error ? error.message : String(error)}`
          });
        } finally {
          setProcessing(false);
        }
      }
    };

    // Track execution start time for performance metrics
    const executeStartTime = Date.now();
    handleFileSelection();
  }, [selectedFiles, executing, executed, nodeData, onResult, processing]);

  // When a file is uploaded, automatically add it to the selected files
  const handleFileUploadComplete = (newFiles: any[]) => {
    if (newFiles && newFiles.length > 0) {
      setSelectedFiles(prev => {
        // Check if we should replace or add based on allowMultiple setting
        if (nodeData.config?.allowMultiple) {
          return [...prev, ...newFiles];
        } else {
          return newFiles;
        }
      });
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedFiles.length === 0) {
      onResult({
        type: 'json',
        content: { files: [], message: 'No files selected' },
        error: 'No files were selected for processing'
      });
    } else {
      setExecuted(true);
      
      // Process selected files
      const processed = await processSelectedFiles(selectedFiles);
      
      // Create output
      const output: AssetOutput = {
        type: 'json',
        content: {
          files: processed.map(file => ({
            id: file.id,
            name: file.filename,
            type: file.type,
            size: file.size,
            url: file.url || `/api/file/${file.id}`,
            uploadDate: file.uploadDate,
            ...(file.processedId ? {
              processedId: file.processedId,
              processedType: file.processedType
            } : {})
          })),
          totalFiles: processed.length,
          configuration: nodeData.config || {},
        },
        metadata: {
          nodeId: nodeData.id,
          nodeType: 'fileupload',
          timestamp: new Date().toISOString(),
          fileTypes: processed.map(file => file.type),
        }
      };

      onResult(output);
    }
  };

  const handleReset = () => {
    if (fileListRef.current) {
      fileListRef.current.clearSelection();
    }
    setSelectedFiles([]);
    setProcessedFiles([]);
    setExecuted(false);
  };

  // Render a summary of the selected files
  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;
    
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Selected Files:
        </Typography>
        <List dense>
          {selectedFiles.map((file) => (
            <ListItem key={file.id} disablePadding>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getFileTypeIcon(file.type)}
              </ListItemIcon>
              <ListItemText 
                primary={file.filename} 
                secondary={`${(file.size / 1024).toFixed(1)} KB · ${new Date(file.uploadDate).toLocaleDateString()}`}
              />
              {processing && <CircularProgress size={16} sx={{ ml: 1 }} />}
              {file.processedId && <CheckIcon color="success" sx={{ ml: 1 }} />}
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {nodeData.label || `${getFileTypeName(nodeData.fileType)} Upload`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {nodeData.description || `Select or upload ${nodeData.fileType === 'any' ? 'files' : nodeData.fileType + ' files'}`}
        </Typography>
        {nodeData.config?.allowMultiple && (
          <Typography variant="body2" sx={{ mt: 1, color: 'primary.main' }}>
            Multiple file selection is enabled
          </Typography>
        )}
        {executed && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected and ready for processing
          </Alert>
        )}
      </Box>

      {processing && (
        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={20} sx={{ mr: 2 }} />
            <Typography>Processing files with MarkItDown...</Typography>
          </Box>
        </Alert>
      )}

      {renderSelectedFiles()}

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* File selection area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <FileList 
            ref={fileListRef}
            onSelectedFilesChange={setSelectedFiles}
            onFileUploadComplete={handleFileUploadComplete}
          />
        </Box>

        {/* Action buttons */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {!executed ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={processing ? <CircularProgress size={20} /> : <UploadIcon />}
              onClick={handleConfirmSelection}
              disabled={processing || selectedFiles.length === 0}
            >
              {processing ? 'Processing...' : 'Confirm Selection'}
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={processing}
              >
                Reset Selection
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                disabled
              >
                Files Selected
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default FileUploadExecutorComponent; 