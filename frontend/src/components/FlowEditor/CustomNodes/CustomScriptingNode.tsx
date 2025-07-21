/**
 * Custom Scripting Node
 * 
 * Purpose: To allow custom code execution for bespoke processing.
 * 
 * Features:
 * - Built-in code editor
 * - Support for JavaScript (or Python via backend call)
 * - Input/output variable mapping
 * - Error handling and timeouts
 * 
 * User Configuration:
 * - Code editor area
 * - Runtime options (JavaScript/Python)
 * - Execution timeout
 * 
 * Help Text: "Insert your custom code here. This node allows you to define bespoke 
 * processing logic using a built-in editor."
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
  Slider,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  Code as CodeIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface CustomScriptingNodeData {
  id: string;
  label: string;
  language: 'javascript' | 'python';
  code: string;
  timeout: number; // in milliseconds
  lastExecutionTime?: number;
  lastExecutionStatus?: 'success' | 'error';
  lastExecutionResult?: string;
  lastExecutionError?: string;
}

const SAMPLE_CODE = {
  javascript: `// Available variables:
// - input: the data passed to this node
// - output: the data to pass to the next node

// Example: Convert input data to uppercase
if (input.text) {
  output.text = input.text.toUpperCase();
}

// Return the output data
return output;`,
  python: `# Available variables:
# - input: the data passed to this node
# - output: the data to pass to the next node

# Example: Convert input data to uppercase
if 'text' in input:
    output['text'] = input['text'].upper()

# Return the output data
return output`,
};

const CustomScriptingNode: React.FC<NodeProps<CustomScriptingNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<CustomScriptingNodeData>({
    id: data.id || '',
    label: data.label || 'Custom Script',
    language: data.language || 'javascript',
    code: data.code || SAMPLE_CODE.javascript,
    timeout: data.timeout || 5000,
    lastExecutionTime: data.lastExecutionTime,
    lastExecutionStatus: data.lastExecutionStatus,
    lastExecutionResult: data.lastExecutionResult,
    lastExecutionError: data.lastExecutionError,
  });

  // Help text for the tooltip
  const helpText = "Insert your custom code here. This node allows you to define bespoke processing logic using a built-in editor.";

  const handleChange = (field: keyof CustomScriptingNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };

    // If changing language, update the sample code if code is empty or the default for the other language
    if (field === 'language') {
      if (
        nodeData.code === SAMPLE_CODE.javascript || 
        nodeData.code === SAMPLE_CODE.python ||
        !nodeData.code
      ) {
        updatedData.code = SAMPLE_CODE[value as 'javascript' | 'python'];
      }
    }

    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  // Simulate code execution (in a real implementation, this would call a backend service)
  const handleRunCode = () => {
    // Simulate execution
    const startTime = Date.now();
    
    try {
      // Just a simulation - in a real app, this would be handled safely
      // or sent to a backend
      const result = "Simulation: Code executed successfully";
      
      handleChange('lastExecutionTime', Date.now() - startTime);
      handleChange('lastExecutionStatus', 'success');
      handleChange('lastExecutionResult', result);
      handleChange('lastExecutionError', undefined);
    } catch (error) {
      handleChange('lastExecutionTime', Date.now() - startTime);
      handleChange('lastExecutionStatus', 'error');
      handleChange('lastExecutionResult', undefined);
      handleChange('lastExecutionError', (error as Error).message);
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
          width: 350,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
        }}
      >
        {/* Header with title and help icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon fontSize="small" />
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
          {/* Language selector */}
          <FormControl fullWidth size="small">
            <InputLabel>Language</InputLabel>
            <Select
              value={nodeData.language}
              label="Language"
              onChange={(e) => handleChange('language', e.target.value)}
            >
              <MenuItem value="javascript">JavaScript</MenuItem>
              <MenuItem value="python">Python</MenuItem>
            </Select>
          </FormControl>

          {/* Code editor */}
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Code"
            value={nodeData.code}
            onChange={(e) => handleChange('code', e.target.value)}
            InputProps={{
              style: {
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.875rem',
              },
            }}
          />

          {/* Execution timeout */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Execution Timeout: {nodeData.timeout / 1000}s
            </Typography>
            <Slider
              min={1000}
              max={60000}
              step={1000}
              value={nodeData.timeout}
              onChange={(_, value) => handleChange('timeout', value)}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value / 1000}s`}
              size="small"
            />
          </Box>

          {/* Run button and execution status */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<RunIcon />}
              onClick={handleRunCode}
            >
              Test Run
            </Button>

            {nodeData.lastExecutionStatus && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {nodeData.lastExecutionTime ? `${nodeData.lastExecutionTime}ms` : ''}
                </Typography>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: nodeData.lastExecutionStatus === 'success' ? 'success.main' : 'error.main',
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Execution result/error */}
          {(nodeData.lastExecutionResult || nodeData.lastExecutionError) && (
            <Box 
              sx={{ 
                p: 1, 
                mt: 1, 
                bgcolor: nodeData.lastExecutionStatus === 'success' ? 'success.light' : 'error.light',
                borderRadius: 1,
                fontSize: '0.75rem',
                fontFamily: '"Roboto Mono", monospace',
                color: nodeData.lastExecutionStatus === 'success' ? 'success.dark' : 'error.dark',
              }}
            >
              {nodeData.lastExecutionResult || nodeData.lastExecutionError}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        style={{ background: '#555', width: 10, height: 10 }}
      />
    </>
  );
};

export default CustomScriptingNode; 