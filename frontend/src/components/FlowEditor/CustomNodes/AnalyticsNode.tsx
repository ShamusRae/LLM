/**
 * Analytics & Visualization Node
 * 
 * Purpose: To generate visual reports and dashboards from processed data.
 * 
 * Features:
 * - Chart and graph generation (bar, line, pie, etc.)
 * - Customizable report templates
 * - Data filtering and aggregation
 * - Export options for reports
 * 
 * User Configuration:
 * - Report type (dropdown)
 * - Data fields to include
 * - Visualization options
 * 
 * Help Text: "This node creates analytics reports. Configure the type of report, 
 * select data fields, and adjust visualization settings."
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  BarChart as ChartIcon,
  PieChart as PieChartIcon,
  ShowChart as LineChartIcon,
  TableChart as TableIcon,
  Palette as ColorIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface AnalyticsNodeData {
  id: string;
  label: string;
  chartType: 'bar' | 'line' | 'pie' | 'table' | 'scatter';
  dataFields: string[];
  colorScheme: 'default' | 'monochrome' | 'pastel' | 'vibrant';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend: boolean;
  aggregationType: 'sum' | 'average' | 'count' | 'min' | 'max';
}

// Available chart types
const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart', icon: <ChartIcon /> },
  { value: 'line', label: 'Line Chart', icon: <LineChartIcon /> },
  { value: 'pie', label: 'Pie Chart', icon: <PieChartIcon /> },
  { value: 'table', label: 'Data Table', icon: <TableIcon /> },
  { value: 'scatter', label: 'Scatter Plot', icon: <LineChartIcon /> },
];

// Available color schemes
const COLOR_SCHEMES = [
  { value: 'default', label: 'Default' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'vibrant', label: 'Vibrant' },
];

// Available aggregation types
const AGGREGATION_TYPES = [
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

// Sample data fields
const SAMPLE_DATA_FIELDS = [
  'revenue',
  'expenses',
  'profit',
  'customers',
  'transactions',
  'time',
  'date',
  'location',
  'category',
  'product',
];

const AnalyticsNode: React.FC<NodeProps<AnalyticsNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<AnalyticsNodeData>({
    id: data.id || '',
    label: data.label || 'Analytics',
    chartType: data.chartType || 'bar',
    dataFields: data.dataFields || ['revenue', 'time'],
    colorScheme: data.colorScheme || 'default',
    title: data.title || 'Analytics Report',
    xAxisLabel: data.xAxisLabel || 'Time',
    yAxisLabel: data.yAxisLabel || 'Value',
    showLegend: data.showLegend ?? true,
    aggregationType: data.aggregationType || 'sum',
  });

  // Help text for the tooltip
  const helpText = "This node creates analytics reports. Configure the type of report, select data fields, and adjust visualization settings.";

  const handleChange = (field: keyof AnalyticsNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  const handleFieldToggle = (field: string) => {
    const currentFields = [...nodeData.dataFields];
    const newFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field];
    
    handleChange('dataFields', newFields);
  };

  // Get chart icon based on type
  const getChartIcon = () => {
    const chartType = CHART_TYPES.find(type => type.value === nodeData.chartType);
    return chartType?.icon || <ChartIcon />;
  };

  // Simulate chart export
  const handleExportChart = () => {
    alert('Export functionality would be implemented in a real application.');
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
            {getChartIcon()}
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

        {/* Chart preview placeholder */}
        <Box 
          sx={{ 
            height: 120, 
            bgcolor: '#f0f0f0', 
            mb: 2, 
            borderRadius: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px dashed #ccc',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ mb: 1 }}>
              {getChartIcon()}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {nodeData.title}
            </Typography>
          </Box>
        </Box>

        {/* Configuration fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Report title */}
          <TextField
            fullWidth
            size="small"
            label="Report Title"
            value={nodeData.title}
            onChange={(e) => handleChange('title', e.target.value)}
          />

          {/* Chart type selector */}
          <FormControl fullWidth size="small">
            <InputLabel>Chart Type</InputLabel>
            <Select
              value={nodeData.chartType}
              label="Chart Type"
              onChange={(e) => handleChange('chartType', e.target.value)}
            >
              {CHART_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {type.icon}
                    <Typography variant="body2">{type.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Axis labels - not needed for pie or table */}
          {(nodeData.chartType === 'bar' || nodeData.chartType === 'line' || nodeData.chartType === 'scatter') && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                label="X-Axis Label"
                value={nodeData.xAxisLabel}
                onChange={(e) => handleChange('xAxisLabel', e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Y-Axis Label"
                value={nodeData.yAxisLabel}
                onChange={(e) => handleChange('yAxisLabel', e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>
          )}

          {/* Color scheme */}
          <FormControl fullWidth size="small">
            <InputLabel>Color Scheme</InputLabel>
            <Select
              value={nodeData.colorScheme}
              label="Color Scheme"
              onChange={(e) => handleChange('colorScheme', e.target.value)}
              startAdornment={<ColorIcon sx={{ ml: 1, mr: 1 }} />}
            >
              {COLOR_SCHEMES.map(scheme => (
                <MenuItem key={scheme.value} value={scheme.value}>
                  {scheme.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Data aggregation */}
          <FormControl fullWidth size="small">
            <InputLabel>Aggregation</InputLabel>
            <Select
              value={nodeData.aggregationType}
              label="Aggregation"
              onChange={(e) => handleChange('aggregationType', e.target.value)}
            >
              {AGGREGATION_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Legend toggle */}
          <FormControlLabel
            control={
              <Checkbox
                checked={nodeData.showLegend}
                onChange={(e) => handleChange('showLegend', e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Show Legend</Typography>}
          />

          <Divider />

          {/* Data fields */}
          <Typography variant="body2" gutterBottom>
            Data Fields
          </Typography>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
          }}>
            {SAMPLE_DATA_FIELDS.map(field => (
              <FormControlLabel
                key={field}
                control={
                  <Checkbox
                    checked={nodeData.dataFields.includes(field)}
                    onChange={() => handleFieldToggle(field)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">{field}</Typography>}
              />
            ))}
          </Box>

          {/* Export button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportChart}
          >
            Export Chart
          </Button>
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

export default AnalyticsNode; 