/**
 * Pre-made Microservices Node
 * 
 * Purpose: To call our existing microservices layer for specialized tasks.
 * 
 * Features:
 * - Executes predefined API calls to our backend microservices
 * - Handles authentication and authorization
 * - Configurable parameters for each microservice
 * - Supports various response formats
 * 
 * User Configuration:
 * - Service endpoint URL (text input)
 * - Authentication token (text input)
 * - Specific parameters for the selected microservice (dynamic fields)
 * 
 * Help Text: "This node triggers predefined microservice actions. Configure the 
 * endpoint, credentials, and parameters as required."
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
  Divider,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  Cloud as CloudIcon,
  Api as ApiIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface MicroservicesNodeData {
  id: string;
  label: string;
  serviceType: string;
  endpoint: string;
  authToken: string;
  parameters: Record<string, string>;
}

// Available microservice types
const MICROSERVICE_TYPES = [
  { value: 'data-processing', label: 'Data Processing' },
  { value: 'document-analysis', label: 'Document Analysis' },
  { value: 'entity-extraction', label: 'Entity Extraction' },
  { value: 'sentiment-analysis', label: 'Sentiment Analysis' },
  { value: 'custom-api', label: 'Custom API' },
];

// Parameter fields for each microservice type
const getParameterFields = (serviceType: string) => {
  switch (serviceType) {
    case 'data-processing':
      return [
        { name: 'format', label: 'Data Format', type: 'text' },
        { name: 'processingLevel', label: 'Processing Level', type: 'select', options: ['basic', 'advanced', 'expert'] },
      ];
    case 'document-analysis':
      return [
        { name: 'documentType', label: 'Document Type', type: 'text' },
        { name: 'language', label: 'Language', type: 'text' },
        { name: 'extractTables', label: 'Extract Tables', type: 'boolean' },
      ];
    case 'entity-extraction':
      return [
        { name: 'entityTypes', label: 'Entity Types', type: 'text' },
        { name: 'confidence', label: 'Confidence Threshold', type: 'number' },
      ];
    case 'sentiment-analysis':
      return [
        { name: 'language', label: 'Language', type: 'text' },
        { name: 'model', label: 'Model', type: 'select', options: ['basic', 'advanced'] },
      ];
    case 'custom-api':
      return [
        { name: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
        { name: 'contentType', label: 'Content Type', type: 'text' },
        { name: 'timeout', label: 'Timeout (ms)', type: 'number' },
      ];
    default:
      return [];
  }
};

const MicroservicesNode: React.FC<NodeProps<MicroservicesNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<MicroservicesNodeData>({
    id: data.id || '',
    label: data.label || 'Microservice',
    serviceType: data.serviceType || 'data-processing',
    endpoint: data.endpoint || 'https://api.example.com/service',
    authToken: data.authToken || '',
    parameters: data.parameters || {},
  });

  // Help text for the tooltip
  const helpText = "This node triggers predefined microservice actions. Configure the endpoint, credentials, and parameters as required.";

  const handleChange = (field: keyof MicroservicesNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  const handleParameterChange = (name: string, value: string) => {
    const updatedParameters = {
      ...nodeData.parameters,
      [name]: value,
    };
    handleChange('parameters', updatedParameters);
  };

  // Get parameter fields for the current service type
  const paramFields = getParameterFields(nodeData.serviceType);

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
            <ApiIcon fontSize="small" />
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

        {/* Service type indicator */}
        <Box sx={{ mb: 2 }}>
          <Chip 
            icon={<CloudIcon fontSize="small" />} 
            label={MICROSERVICE_TYPES.find(t => t.value === nodeData.serviceType)?.label || 'Service'} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>

        {/* Configuration fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Service type dropdown */}
          <FormControl fullWidth size="small">
            <InputLabel>Service Type</InputLabel>
            <Select
              value={nodeData.serviceType}
              label="Service Type"
              onChange={(e) => handleChange('serviceType', e.target.value)}
            >
              {MICROSERVICE_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Endpoint URL */}
          <TextField
            fullWidth
            size="small"
            label="Endpoint URL"
            value={nodeData.endpoint}
            onChange={(e) => handleChange('endpoint', e.target.value)}
          />

          {/* Auth Token */}
          <TextField
            fullWidth
            size="small"
            label="Auth Token"
            value={nodeData.authToken}
            onChange={(e) => handleChange('authToken', e.target.value)}
            type="password"
          />

          {/* Service-specific parameters */}
          {paramFields.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" gutterBottom>
                Service Parameters
              </Typography>

              {paramFields.map(field => (
                <Box key={field.name}>
                  {field.type === 'select' ? (
                    <FormControl fullWidth size="small">
                      <InputLabel>{field.label}</InputLabel>
                      <Select
                        value={nodeData.parameters[field.name] || ''}
                        label={field.label}
                        onChange={(e) => handleParameterChange(field.name, e.target.value)}
                      >
                        {field.options?.map(option => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      size="small"
                      label={field.label}
                      value={nodeData.parameters[field.name] || ''}
                      onChange={(e) => handleParameterChange(field.name, e.target.value)}
                      type={field.type === 'number' ? 'number' : 'text'}
                    />
                  )}
                </Box>
              ))}
            </>
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

export default MicroservicesNode; 