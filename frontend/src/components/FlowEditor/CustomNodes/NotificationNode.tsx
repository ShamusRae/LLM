/**
 * Notification & Alerting Node
 * 
 * Purpose: To send alerts or notifications based on workflow events.
 * 
 * Features:
 * - Email, SMS, or in-app notification integrations
 * - Customizable message templates
 * - Scheduled or event-triggered notifications
 * - Recipient management
 * 
 * User Configuration:
 * - Notification channel (dropdown)
 * - Recipient details
 * - Message template
 * 
 * Help Text: "Configure this node to send notifications. Select the channel, 
 * specify recipients, and customize your message template."
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
  TextField,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  Notifications as NotificationIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Computer as AppIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface NotificationNodeData {
  id: string;
  label: string;
  channel: 'email' | 'sms' | 'app' | 'webhook';
  recipients: string[];
  subject: string;
  messageTemplate: string;
  isScheduled: boolean;
  scheduleTime?: string;
  priority: 'low' | 'medium' | 'high';
  variables: Record<string, boolean>;
}

// Notification channels
const NOTIFICATION_CHANNELS = [
  { value: 'email', label: 'Email', icon: <EmailIcon /> },
  { value: 'sms', label: 'SMS', icon: <SmsIcon /> },
  { value: 'app', label: 'In-App', icon: <AppIcon /> },
  { value: 'webhook', label: 'Webhook', icon: <NotificationIcon /> },
];

// Sample message variables (for template injection)
const MESSAGE_VARIABLES = [
  { name: 'user_name', label: 'User Name' },
  { name: 'user_email', label: 'User Email' },
  { name: 'date', label: 'Current Date' },
  { name: 'time', label: 'Current Time' },
  { name: 'transaction_id', label: 'Transaction ID' },
  { name: 'status', label: 'Status' },
];

const NotificationNode: React.FC<NodeProps<NotificationNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<NotificationNodeData>({
    id: data.id || '',
    label: data.label || 'Notification',
    channel: data.channel || 'email',
    recipients: data.recipients || [],
    subject: data.subject || 'Notification from workflow',
    messageTemplate: data.messageTemplate || 'Hello {{user_name}},\n\nThis is an automated notification from the system.\n\nBest regards,\nThe System',
    isScheduled: data.isScheduled || false,
    scheduleTime: data.scheduleTime || '',
    priority: data.priority || 'medium',
    variables: data.variables || { user_name: true, date: true },
  });

  // New recipient value
  const [newRecipient, setNewRecipient] = useState('');

  // Help text for the tooltip
  const helpText = "Configure this node to send notifications. Select the channel, specify recipients, and customize your message template.";

  const handleChange = (field: keyof NotificationNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  // Add recipient to the list
  const handleAddRecipient = () => {
    if (!newRecipient.trim()) return;
    
    // Validate format based on channel type
    let isValid = true;
    if (nodeData.channel === 'email') {
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipient);
    } else if (nodeData.channel === 'sms') {
      isValid = /^\+?[0-9]{10,15}$/.test(newRecipient);
    }

    if (isValid) {
      const updatedRecipients = [...nodeData.recipients, newRecipient.trim()];
      handleChange('recipients', updatedRecipients);
      setNewRecipient('');
    } else {
      alert(`Invalid ${nodeData.channel === 'email' ? 'email address' : 'phone number'}`);
    }
  };

  // Remove a recipient
  const handleRemoveRecipient = (recipient: string) => {
    const updatedRecipients = nodeData.recipients.filter(r => r !== recipient);
    handleChange('recipients', updatedRecipients);
  };

  // Toggle a variable inclusion
  const handleToggleVariable = (variable: string) => {
    const updatedVariables = {
      ...nodeData.variables,
      [variable]: !nodeData.variables[variable],
    };
    handleChange('variables', updatedVariables);
  };

  // Get placeholder/helper text based on channel
  const getRecipientPlaceholder = () => {
    switch (nodeData.channel) {
      case 'email': return 'example@domain.com';
      case 'sms': return '+1234567890';
      case 'app': return 'User ID or username';
      case 'webhook': return 'Webhook URL';
      default: return 'Recipient';
    }
  };

  // Get icon for notification channel
  const getChannelIcon = () => {
    const channel = NOTIFICATION_CHANNELS.find(c => c.value === nodeData.channel);
    return channel?.icon || <NotificationIcon />;
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
          width: 320,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
        }}
      >
        {/* Header with title and help icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getChannelIcon()}
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
          {/* Channel selector */}
          <FormControl fullWidth size="small">
            <InputLabel>Notification Channel</InputLabel>
            <Select
              value={nodeData.channel}
              label="Notification Channel"
              onChange={(e) => handleChange('channel', e.target.value)}
            >
              {NOTIFICATION_CHANNELS.map(channel => (
                <MenuItem key={channel.value} value={channel.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {channel.icon}
                    <Typography variant="body2">{channel.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Priority */}
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={nodeData.priority}
              label="Priority"
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>

          {/* Subject */}
          <TextField
            fullWidth
            size="small"
            label="Subject/Title"
            value={nodeData.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
          />

          {/* Recipients */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Recipients
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={getRecipientPlaceholder()}
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
              />
              <IconButton 
                size="small" 
                onClick={handleAddRecipient}
                color="primary"
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <AddIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 100, overflow: 'auto' }}>
              {nodeData.recipients.map((recipient, index) => (
                <Chip
                  key={index}
                  label={recipient}
                  size="small"
                  onDelete={() => handleRemoveRecipient(recipient)}
                />
              ))}
              {nodeData.recipients.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                  No recipients added
                </Typography>
              )}
            </Box>
          </Box>

          {/* Schedule toggle */}
          <FormControlLabel
            control={
              <Checkbox
                checked={nodeData.isScheduled}
                onChange={(e) => handleChange('isScheduled', e.target.checked)}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon fontSize="small" />
                <Typography variant="body2">Schedule Notification</Typography>
              </Box>
            }
          />

          {/* Schedule time - only shown if scheduled is true */}
          {nodeData.isScheduled && (
            <TextField
              fullWidth
              size="small"
              label="Schedule Time"
              type="datetime-local"
              value={nodeData.scheduleTime}
              onChange={(e) => handleChange('scheduleTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          )}

          <Divider />

          {/* Message template */}
          <Typography variant="body2" gutterBottom>
            Message Template
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Enter your message template here..."
            value={nodeData.messageTemplate}
            onChange={(e) => handleChange('messageTemplate', e.target.value)}
          />

          {/* Variables */}
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Available Variables:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {MESSAGE_VARIABLES.map(variable => (
              <Chip
                key={variable.name}
                label={`{{${variable.name}}}`}
                size="small"
                color={nodeData.variables[variable.name] ? 'primary' : 'default'}
                onClick={() => handleToggleVariable(variable.name)}
                variant={nodeData.variables[variable.name] ? 'filled' : 'outlined'}
              />
            ))}
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

export default NotificationNode; 