import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { 
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as SpreadsheetIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface FileUploadNodeData {
  id: string;
  label: string;
  description?: string;
  fileType: string;
  config: {
    allowMultiple: boolean;
    maxFileSize?: number; // In MB
    acceptedExtensions?: string[];
    processImmediately?: boolean;
  };
}

// Get the appropriate icon based on file type
const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'pdf':
      return <PdfIcon />;
    case 'word':
      return <DocIcon />;
    case 'excel':
    case 'csv':
      return <SpreadsheetIcon />;
    case 'txt':
      return <FileIcon />; 
    default:
      return <FileIcon />;
  }
};

// Get display name for file type
const getFileTypeName = (fileType: string) => {
  switch (fileType) {
    case 'any':
      return 'Any File';
    case 'pdf':
      return 'PDF Document';
    case 'word':
      return 'Word Document';
    case 'excel':
      return 'Excel Spreadsheet';
    case 'csv':
      return 'CSV File';
    case 'txt':
      return 'Text File';
    default:
      return 'File';
  }
};

// Get accepted extensions for each file type
const getAcceptedExtensions = (fileType: string): string[] => {
  switch (fileType) {
    case 'pdf':
      return ['.pdf'];
    case 'word':
      return ['.doc', '.docx'];
    case 'excel':
      return ['.xls', '.xlsx'];
    case 'csv':
      return ['.csv'];
    case 'txt':
      return ['.txt'];
    default:
      return [];
  }
};

const FileUploadNode: React.FC<NodeProps<FileUploadNodeData>> = ({ 
  id, 
  data, 
  selected, 
  isConnectable 
}) => {
  const dispatch = useAppDispatch();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(data.config || {
    allowMultiple: false,
    processImmediately: true,
    maxFileSize: 10,
    acceptedExtensions: getAcceptedExtensions(data.fileType),
  });

  const handleConfigOpen = () => setIsConfigOpen(true);
  const handleConfigClose = () => setIsConfigOpen(false);

  const handleConfigChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfig = () => {
    dispatch(updateNode({ 
      id, 
      data: { 
        ...data, 
        config: localConfig 
      } 
    }));
    handleConfigClose();
  };

  return (
    <>
      {/* Output handle - only one allowed */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        isConnectable={isConnectable}
        style={{ 
          background: '#555', 
          width: 10, 
          height: 10,
        }}
      />

      <Paper
        elevation={2}
        sx={{
          padding: 2,
          width: 200,
          backgroundColor: selected ? '#f0f7ff' : '#f8f9fa',
          border: '1px solid',
          borderColor: selected ? 'primary.main' : '#e0e0e0',
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getFileIcon(data.fileType)}
            <Typography variant="subtitle1" fontWeight="medium">
              {data.label || getFileTypeName(data.fileType)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleConfigOpen}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {data.description || `Upload ${data.fileType === 'any' ? 'files' : data.fileType + ' files'}`}
        </Typography>
        
        {localConfig.allowMultiple && (
          <Chip 
            label="Multiple Files" 
            size="small" 
            color="primary" 
            variant="outlined" 
            sx={{ mt: 1 }}
          />
        )}
      </Paper>

      {/* Configuration Dialog */}
      <Dialog 
        open={isConfigOpen} 
        onClose={handleConfigClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configure File Upload</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.allowMultiple || false}
                  onChange={(e) => handleConfigChange('allowMultiple', e.target.checked)}
                />
              }
              label="Allow Multiple Files"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.processImmediately || false}
                  onChange={(e) => handleConfigChange('processImmediately', e.target.checked)}
                />
              }
              label="Process Files Immediately"
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Max File Size (MB)"
              type="number"
              value={localConfig.maxFileSize || 10}
              onChange={(e) => handleConfigChange('maxFileSize', Number(e.target.value))}
            />
            
            {data.fileType === 'any' && (
              <TextField
                fullWidth
                margin="normal"
                label="Accepted Extensions"
                placeholder=".pdf, .doc, .xlsx"
                value={(localConfig.acceptedExtensions || []).join(', ')}
                onChange={(e) => {
                  const extensions = e.target.value.split(',').map(ext => ext.trim()).filter(Boolean);
                  handleConfigChange('acceptedExtensions', extensions);
                }}
                helperText="Comma separated list of allowed extensions"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfigClose}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileUploadNode; 