/**
 * Conditional & Decision Node
 * 
 * Purpose: To add branching logic based on specified conditions.
 * 
 * Features:
 * - Evaluates conditions and routes data accordingly (if/else)
 * - Supports complex condition expressions
 * - Multiple output paths based on conditions
 * - Visual indication of active branch
 * 
 * User Configuration:
 * - Condition expression (text input)
 * - True/false branch configuration
 * 
 * Help Text: "This node lets you create decision points in your flow. Define 
 * conditions that determine which branch the data follows."
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
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  CallSplit as SplitIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface ConditionalNodeData {
  id: string;
  label: string;
  conditionType: 'expression' | 'property' | 'comparison';
  condition: string;
  property?: string; // For property-based conditions
  operator?: string; // For comparison conditions
  value?: string; // For comparison conditions
  ifTrueLabel: string;
  ifFalseLabel: string;
}

// Operators for comparison
const OPERATORS = [
  { value: 'eq', label: 'Equals (==)' },
  { value: 'neq', label: 'Not Equals (!=)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'gte', label: 'Greater Than or Equal (>=)' },
  { value: 'lte', label: 'Less Than or Equal (<=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
];

const ConditionalNode: React.FC<NodeProps<ConditionalNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<ConditionalNodeData>({
    id: data.id || '',
    label: data.label || 'Decision',
    conditionType: data.conditionType || 'expression',
    condition: data.condition || '',
    property: data.property || '',
    operator: data.operator || 'eq',
    value: data.value || '',
    ifTrueLabel: data.ifTrueLabel || 'True',
    ifFalseLabel: data.ifFalseLabel || 'False',
  });

  // Help text for the tooltip
  const helpText = "This node lets you create decision points in your flow. Define conditions that determine which branch the data follows.";

  const handleChange = (field: keyof ConditionalNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  // Get the actual condition expression based on the condition type
  const getConditionExpression = () => {
    switch (nodeData.conditionType) {
      case 'property':
        return `data.${nodeData.property}`;
      case 'comparison':
        const op = OPERATORS.find(o => o.value === nodeData.operator);
        if (!op) return '';
        
        switch (nodeData.operator) {
          case 'eq': return `data.${nodeData.property} == ${nodeData.value}`;
          case 'neq': return `data.${nodeData.property} != ${nodeData.value}`;
          case 'gt': return `data.${nodeData.property} > ${nodeData.value}`;
          case 'lt': return `data.${nodeData.property} < ${nodeData.value}`;
          case 'gte': return `data.${nodeData.property} >= ${nodeData.value}`;
          case 'lte': return `data.${nodeData.property} <= ${nodeData.value}`;
          case 'contains': return `data.${nodeData.property}.includes("${nodeData.value}")`;
          case 'startsWith': return `data.${nodeData.property}.startsWith("${nodeData.value}")`;
          case 'endsWith': return `data.${nodeData.property}.endsWith("${nodeData.value}")`;
          default: return '';
        }
      case 'expression':
      default:
        return nodeData.condition;
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
            <SplitIcon fontSize="small" />
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
          {/* Condition Type */}
          <FormControl fullWidth size="small">
            <InputLabel>Condition Type</InputLabel>
            <Select
              value={nodeData.conditionType}
              label="Condition Type"
              onChange={(e) => handleChange('conditionType', e.target.value)}
            >
              <MenuItem value="expression">JavaScript Expression</MenuItem>
              <MenuItem value="property">Property Exists</MenuItem>
              <MenuItem value="comparison">Property Comparison</MenuItem>
            </Select>
          </FormControl>

          {/* Fields based on condition type */}
          {nodeData.conditionType === 'expression' && (
            <TextField
              fullWidth
              size="small"
              label="Condition Expression"
              value={nodeData.condition}
              onChange={(e) => handleChange('condition', e.target.value)}
              placeholder="e.g. data.value > 10 && data.status === 'active'"
              multiline
              rows={2}
            />
          )}

          {nodeData.conditionType === 'property' && (
            <TextField
              fullWidth
              size="small"
              label="Property Path"
              value={nodeData.property}
              onChange={(e) => handleChange('property', e.target.value)}
              placeholder="e.g. user.profile.verified"
            />
          )}

          {nodeData.conditionType === 'comparison' && (
            <>
              <TextField
                fullWidth
                size="small"
                label="Property Path"
                value={nodeData.property}
                onChange={(e) => handleChange('property', e.target.value)}
                placeholder="e.g. user.age"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Operator</InputLabel>
                <Select
                  value={nodeData.operator}
                  label="Operator"
                  onChange={(e) => handleChange('operator', e.target.value)}
                >
                  {OPERATORS.map(op => (
                    <MenuItem key={op.value} value={op.value}>
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Value"
                value={nodeData.value}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="e.g. 18"
              />
            </>
          )}

          {/* Preview of the condition */}
          <Box sx={{ p: 1, backgroundColor: '#f0f0f0', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon fontSize="small" color="action" />
              <Typography variant="caption" fontFamily="monospace">
                {getConditionExpression() || 'Define your condition...'}
              </Typography>
            </Box>
          </Box>

          {/* Branch Labels */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              label="True Branch"
              value={nodeData.ifTrueLabel}
              onChange={(e) => handleChange('ifTrueLabel', e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="False Branch"
              value={nodeData.ifFalseLabel}
              onChange={(e) => handleChange('ifFalseLabel', e.target.value)}
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* True output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        isConnectable={isConnectable}
        style={{ 
          background: '#4caf50', 
          width: 10, 
          height: 10,
          top: '33%',
        }}
      />

      {/* True label */}
      <div style={{ 
        position: 'absolute', 
        right: -10, 
        top: '33%', 
        transform: 'translateY(-50%)',
        fontSize: '11px',
        color: '#4caf50',
        fontWeight: 'bold'
      }}>
        {nodeData.ifTrueLabel}
      </div>

      {/* False output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        isConnectable={isConnectable}
        style={{ 
          background: '#f44336', 
          width: 10, 
          height: 10,
          top: '66%', 
        }}
      />

      {/* False label */}
      <div style={{ 
        position: 'absolute', 
        right: -10, 
        top: '66%', 
        transform: 'translateY(-50%)',
        fontSize: '11px',
        color: '#f44336',
        fontWeight: 'bold'
      }}>
        {nodeData.ifFalseLabel}
      </div>
    </>
  );
};

export default ConditionalNode; 