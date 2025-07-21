/**
 * Error Handling & Logging Node
 * 
 * Purpose: To capture and manage errors, and log processing steps for debugging.
 * 
 * Features:
 * - Error capture and handling
 * - Retry logic with configurable attempts
 * - Comprehensive logging of processing steps
 * - Export capabilities for log data
 * 
 * User Configuration:
 * - Error retry count (number input)
 * - Log level (dropdown: debug, info, warn, error)
 * - Toggle for sending logs to backend
 * 
 * Help Text: "Use this node to handle errors gracefully. Configure retry settings 
 * and logging options to capture and export diagnostic information."
 */

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RetryIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface ErrorHandlingNodeData {
  id: string;
  label: string;
  retryCount: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sendToBackend: boolean;
  errorHandlingMode: 'continue' | 'retry' | 'stop';
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

const ErrorHandlingNode: React.FC<NodeProps<ErrorHandlingNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<ErrorHandlingNodeData>({
    id: data.id || '',
    label: data.label || 'Error Handling',
    retryCount: data.retryCount || 3,
    logLevel: data.logLevel || 'info',
    sendToBackend: data.sendToBackend || false,
    errorHandlingMode: data.errorHandlingMode || 'retry',
    logs: data.logs || [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Error handling node initialized',
      },
    ],
  });

  // Help text for the tooltip
  const helpText = "Use this node to handle errors gracefully. Configure retry settings and logging options to capture and export diagnostic information.";

  const handleChange = (field: keyof ErrorHandlingNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  // Add a new log entry (for example)
  const addLogEntry = (level: 'debug' | 'info' | 'warn' | 'error', message: string) => {
    const newLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    const updatedLogs = [...nodeData.logs, newLog];
    handleChange('logs', updatedLogs);
  };

  // Simulate downloading logs
  const handleDownloadLogs = () => {
    const logText = nodeData.logs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Add a log entry about the export
    addLogEntry('info', 'Logs exported to file');
  };

  // Get color for log level
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return '#9e9e9e';
      case 'info': return '#2196f3';
      case 'warn': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#2196f3';
    }
  };

  return (
    <>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        style={{ background: '#555', width: 10, height: 10 }}
      />

      <Paper
        elevation={2}
        sx={{
          padding: 2,
          width: 300,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
        }}
      >
        {/* Header with title and help icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorIcon fontSize="small" color="error" />
            <Typography variant="subtitle1" fontWeight="bold">
              {nodeData.label}
            </Typography>
          </Box>
          <Tooltip title={helpText} placement="top">
            <IconButton size="small">
              <HelpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Configuration fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Error handling mode */}
          <FormControl fullWidth size="small">
            <InputLabel>Error Handling</InputLabel>
            <Select
              value={nodeData.errorHandlingMode}
              label="Error Handling"
              onChange={(e) => handleChange('errorHandlingMode', e.target.value)}
            >
              <MenuItem value="continue">Continue (Ignore Errors)</MenuItem>
              <MenuItem value="retry">Retry</MenuItem>
              <MenuItem value="stop">Stop (Propagate Error)</MenuItem>
            </Select>
          </FormControl>

          {/* Retry count - only shown if retry mode is selected */}
          {nodeData.errorHandlingMode === 'retry' && (
            <TextField
              fullWidth
              size="small"
              label="Retry Count"
              type="number"
              InputProps={{ inputProps: { min: 1, max: 10 } }}
              value={nodeData.retryCount}
              onChange={(e) => handleChange('retryCount', parseInt(e.target.value, 10) || 1)}
            />
          )}

          <Divider />

          {/* Logging options */}
          <Typography variant="body2" gutterBottom>
            Logging Options
          </Typography>

          {/* Log level */}
          <FormControl fullWidth size="small">
            <InputLabel>Log Level</InputLabel>
            <Select
              value={nodeData.logLevel}
              label="Log Level"
              onChange={(e) => handleChange('logLevel', e.target.value)}
            >
              <MenuItem value="debug">Debug</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warn">Warning</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>

          {/* Send to backend toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={nodeData.sendToBackend}
                onChange={(e) => handleChange('sendToBackend', e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Send Logs to Backend</Typography>}
          />

          {/* Log preview */}
          <Box
            sx={{
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              height: 120,
              overflow: 'auto',
              p: 1,
              fontSize: '0.75rem',
              fontFamily: '"Roboto Mono", monospace',
              bgcolor: '#f5f5f5',
            }}
          >
            {nodeData.logs.slice(-5).map((log, index) => (
              <Box key={index} sx={{ mb: 0.5 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: getLogLevelColor(log.level),
                    display: 'inline',
                    mr: 1,
                    fontWeight: 'bold',
                  }}
                >
                  [{log.level.toUpperCase()}]
                </Typography>
                <Typography variant="caption" sx={{ display: 'inline' }}>
                  {log.message}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Export logs button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadLogs}
          >
            Export Logs
          </Button>
        </Box>
      </Paper>

      {/* Success output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="success"
        isConnectable={isConnectable}
        style={{ 
          background: '#4caf50', 
          width: 10, 
          height: 10,
          top: '40%', 
        }}
      />

      {/* Error output handle - only shown if not in 'continue' mode */}
      {nodeData.errorHandlingMode !== 'continue' && (
        <Handle
          type="source"
          position={Position.Right}
          id="error"
          isConnectable={isConnectable}
          style={{ 
            background: '#f44336', 
            width: 10, 
            height: 10,
            top: '60%', 
          }}
        />
      )}
    </>
  );
};

export default ErrorHandlingNode; 