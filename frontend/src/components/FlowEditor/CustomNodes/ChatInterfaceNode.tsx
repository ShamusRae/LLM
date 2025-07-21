/**
 * Chat Interface Node
 * 
 * Purpose: To provide a chat-like interface for interactive user input/output.
 * 
 * Features:
 * - Displays conversation history
 * - Supports user message input
 * - Shows LLM responses in real-time
 * - Customizable appearance and behavior
 * 
 * User Configuration:
 * - Chat title (text input)
 * - Default prompt message (text input)
 * - UI theme toggle (light/dark)
 * 
 * Help Text: "This node provides a conversational interface. Use it for interactive 
 * dialogs and to visualize real-time chat communications."
 */

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface ChatInterfaceNodeData {
  id: string;
  label: string;
  chatTitle: string;
  defaultPrompt: string;
  darkMode: boolean;
}

const ChatInterfaceNode: React.FC<NodeProps<ChatInterfaceNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<ChatInterfaceNodeData>({
    id: data.id || '',
    label: data.label || 'Chat Interface',
    chatTitle: data.chatTitle || 'AI Assistant',
    defaultPrompt: data.defaultPrompt || 'How can I help you today?',
    darkMode: data.darkMode || false,
  });

  // Help text for the tooltip
  const helpText = "This node provides a conversational interface. Use it for interactive dialogs and to visualize real-time chat communications.";

  const handleChange = (field: keyof ChatInterfaceNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
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
          backgroundColor: nodeData.darkMode ? '#2d3748' : '#f8f9fa',
          border: '1px solid',
          borderColor: nodeData.darkMode ? '#4a5568' : '#e0e0e0',
          color: nodeData.darkMode ? 'white' : 'inherit',
        }}
      >
        {/* Header with title and help icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChatIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">
              {nodeData.label}
            </Typography>
          </Box>
          <Tooltip title={helpText} placement="top">
            <IconButton size="small" sx={{ color: nodeData.darkMode ? 'white' : 'inherit' }}>
              <HelpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Configuration fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Chat title */}
          <TextField
            fullWidth
            size="small"
            label="Chat Title"
            value={nodeData.chatTitle}
            onChange={(e) => handleChange('chatTitle', e.target.value)}
            variant="outlined"
            InputProps={{
              sx: { 
                color: nodeData.darkMode ? 'white' : 'inherit',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: nodeData.darkMode ? '#4a5568' : 'inherit',
                },
              },
            }}
            InputLabelProps={{
              sx: { color: nodeData.darkMode ? '#a0aec0' : 'inherit' },
            }}
          />

          {/* Default prompt */}
          <TextField
            fullWidth
            size="small"
            label="Default Prompt"
            value={nodeData.defaultPrompt}
            onChange={(e) => handleChange('defaultPrompt', e.target.value)}
            multiline
            rows={2}
            variant="outlined"
            InputProps={{
              sx: { 
                color: nodeData.darkMode ? 'white' : 'inherit',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: nodeData.darkMode ? '#4a5568' : 'inherit',
                },
              },
            }}
            InputLabelProps={{
              sx: { color: nodeData.darkMode ? '#a0aec0' : 'inherit' },
            }}
          />

          {/* Theme toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={nodeData.darkMode}
                onChange={(e) => handleChange('darkMode', e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Dark Mode</Typography>}
            sx={{ color: nodeData.darkMode ? 'white' : 'inherit' }}
          />

          {/* Chat preview */}
          <Box 
            sx={{ 
              border: '1px dashed', 
              borderColor: nodeData.darkMode ? '#4a5568' : '#ccc',
              borderRadius: 1,
              p: 1,
              mt: 1,
              backgroundColor: nodeData.darkMode ? '#1a202c' : '#fff',
            }}
          >
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: nodeData.darkMode ? '#a0aec0' : '#666' }}>
              Chat Preview
            </Typography>
            <Box sx={{ pl: 1, borderLeft: '2px solid', borderColor: nodeData.darkMode ? '#4299e1' : '#2196f3' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: nodeData.darkMode ? '#a0aec0' : '#666' }}>
                AI:
              </Typography>
              <Typography variant="body2" sx={{ color: nodeData.darkMode ? '#e2e8f0' : 'inherit' }}>
                {nodeData.defaultPrompt}
              </Typography>
            </Box>
          </Box>
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

export default ChatInterfaceNode; 