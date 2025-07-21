/**
 * LLM Prompt Node
 * 
 * Purpose: To send a prompt to an LLM.
 * 
 * Features:
 * - LLM provider selection (OpenAI, Anthropic, etc.)
 * - Memory settings configuration
 * - Integration with pre-made tools (Internet Search, etc.)
 * - File upload capability for context
 * 
 * User Configuration:
 * - LLM provider (dropdown)
 * - Memory settings (input/slider)
 * - Tools enabled (multi-select)
 * - File upload toggle
 * 
 * Help Text: "Use this node to interact with a Large Language Model. Configure which LLM to use, 
 * manage memory settings, select additional tools, and enable file uploads if needed."
 */

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Switch,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface LLMPromptNodeData {
  id: string;
  label: string;
  provider: string;
  memoryTokens: number;
  enabledTools: string[];
  fileUploadEnabled: boolean;
}

// Available LLM providers
const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'mistral', label: 'Mistral AI' },
];

// Available tools
const AVAILABLE_TOOLS = [
  { value: 'web-search', label: 'Internet Search' },
  { value: 'calculator', label: 'Calculator' },
  { value: 'code-interpreter', label: 'Code Interpreter' },
  { value: 'knowledge-base', label: 'Knowledge Base' },
];

const LLMPromptNode: React.FC<NodeProps<LLMPromptNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<LLMPromptNodeData>({
    id: data.id || '',
    label: data.label || 'LLM Prompt',
    provider: data.provider || 'openai',
    memoryTokens: data.memoryTokens || 4000,
    enabledTools: data.enabledTools || [],
    fileUploadEnabled: data.fileUploadEnabled || false,
  });

  // Help text for the tooltip
  const helpText = "Use this node to interact with a Large Language Model. Configure which LLM to use, manage memory settings, select additional tools, and enable file uploads if needed.";

  const handleChange = (field: keyof LLMPromptNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  const handleToolToggle = (toolId: string) => {
    const updatedTools = nodeData.enabledTools.includes(toolId)
      ? nodeData.enabledTools.filter(id => id !== toolId)
      : [...nodeData.enabledTools, toolId];
    
    handleChange('enabledTools', updatedTools);
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
          <Typography variant="subtitle1" fontWeight="bold">
            {nodeData.label}
          </Typography>
          <Box>
            <Tooltip title={helpText} placement="top">
              <IconButton size="small">
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Configuration fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* LLM Provider dropdown */}
          <FormControl fullWidth size="small">
            <InputLabel>LLM Provider</InputLabel>
            <Select
              value={nodeData.provider}
              label="LLM Provider"
              onChange={(e) => handleChange('provider', e.target.value)}
            >
              {LLM_PROVIDERS.map(provider => (
                <MenuItem key={provider.value} value={provider.value}>
                  {provider.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Memory settings slider */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Memory Tokens: {nodeData.memoryTokens}
            </Typography>
            <Slider
              min={1000}
              max={16000}
              step={1000}
              value={nodeData.memoryTokens}
              onChange={(_, value) => handleChange('memoryTokens', value)}
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>

          {/* Tools selection */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Tools
            </Typography>
            <FormGroup>
              {AVAILABLE_TOOLS.map(tool => (
                <FormControlLabel
                  key={tool.value}
                  control={
                    <Checkbox
                      checked={nodeData.enabledTools.includes(tool.value)}
                      onChange={() => handleToolToggle(tool.value)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">{tool.label}</Typography>}
                />
              ))}
            </FormGroup>
          </Box>

          {/* File upload toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={nodeData.fileUploadEnabled}
                onChange={(e) => handleChange('fileUploadEnabled', e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Enable File Upload</Typography>}
          />
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

export default LLMPromptNode; 