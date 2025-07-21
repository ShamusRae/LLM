/**
 * Data Transformation & Enrichment Node
 * 
 * Purpose: To clean, normalize, and enrich data from incoming feeds.
 * 
 * Features:
 * - Data format conversion (JSON, CSV, XML, etc.)
 * - Data cleaning and normalization
 * - Schema validation and transformation
 * - Data enrichment via external APIs
 * 
 * User Configuration:
 * - Input format (dropdown)
 * - Output format (dropdown)
 * - Transformation options (checkboxes)
 * - API key for enrichment services
 * 
 * Help Text: "Use this node to transform or enrich your data. Choose input/output 
 * formats and provide any necessary API credentials."
 */

import React, { useState, useRef } from 'react';
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
  Chip,
  NativeSelect,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  Transform as TransformIcon,
  DataObject as DataIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface DataTransformationNodeData {
  id: string;
  label: string;
  inputFormat: string;
  outputFormat: string;
  transformations: string[];
  enrichmentApiKey: string;
  enrichmentEnabled: boolean;
  // Format-specific options
  csvOptions?: {
    delimiter: string;
    hasHeader: boolean;
  };
  excelOptions?: {
    sheetName?: string;
    headerRow?: number;
  };
  coaOptions?: {
    standardChartOfAccounts: string;
    mappingMethod: string;
  };
  subLedgerOptions?: {
    subLedgerType: string;
    mappingMethod: string;
    autoSyncToGL: boolean;
  };
}

// Available data input formats
const INPUT_FORMATS = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel Spreadsheet' },
  { value: 'word', label: 'Word Document' },
  { value: 'powerpoint', label: 'PowerPoint' },
  { value: 'voice', label: 'Voice Message' },
];

// Available data output formats
const OUTPUT_FORMATS = [
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'csv', label: 'CSV' },
];

// Available transformations
const TRANSFORMATIONS = [
  { value: 'clean', label: 'Clean Data (Remove Nulls, etc.)' },
  { value: 'map_cdm', label: 'Map to Common Data Model' },
  { value: 'coa_mapping', label: 'Chart of Accounts Mapping' },
  { value: 'subledger_mapping', label: 'Sub-Ledger Mapping' },
];

// Standard Chart of Accounts options
const STANDARD_COA_OPTIONS = [
  { value: 'gaap', label: 'GAAP (US)' },
  { value: 'ifrs', label: 'IFRS (International)' },
  { value: 'xbrl', label: 'XBRL Taxonomy' },
  { value: 'quickbooks', label: 'QuickBooks Standard' },
  { value: 'sage', label: 'Sage Accounting' },
  { value: 'custom', label: 'Custom' },
];

// Sub-Ledger Types
const SUB_LEDGER_TYPES = [
  { value: 'fixed_asset', label: 'Fixed Asset Register' },
  { value: 'accounts_payable', label: 'Accounts Payable' },
  { value: 'accounts_receivable', label: 'Accounts Receivable' },
  { value: 'investments', label: 'Investments' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'tax', label: 'Tax' },
  { value: 'custom', label: 'Custom' },
];

// Mapping methods
const MAPPING_METHODS = [
  { value: 'automatic', label: 'Automatic (AI-assisted)' },
  { value: 'manual', label: 'Manual Mapping' },
  { value: 'hybrid', label: 'Hybrid Approach' },
];

const DataTransformationNode: React.FC<NodeProps<DataTransformationNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const [nodeData, setNodeData] = useState<DataTransformationNodeData>({
    id: data.id || '',
    label: data.label || 'Data Transformation',
    inputFormat: data.inputFormat || 'csv',
    outputFormat: data.outputFormat || 'json',
    transformations: data.transformations || ['clean'],
    enrichmentApiKey: data.enrichmentApiKey || '',
    enrichmentEnabled: data.enrichmentEnabled || false,
    // Format-specific options
    csvOptions: data.csvOptions,
    excelOptions: data.excelOptions,
    coaOptions: data.coaOptions,
    subLedgerOptions: data.subLedgerOptions,
  });

  // Help text for the tooltip
  const helpText = "Use this node to transform or enrich your data. Choose input/output formats and provide any necessary API credentials.";

  const handleChange = (field: keyof DataTransformationNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  const handleTransformationToggle = (value: string) => {
    const currentTransformations = [...nodeData.transformations];
    const newTransformations = currentTransformations.includes(value)
      ? currentTransformations.filter(t => t !== value)
      : [...currentTransformations, value];
    
    handleChange('transformations', newTransformations);
  };

  // Function to create a native select
  const renderNativeSelect = (
    id: string, 
    label: string, 
    value: string, 
    options: {value: string, label: string}[], 
    onChange: (newValue: string) => void
  ) => {
    return (
      <FormControl 
        fullWidth 
        size="small" 
        variant="outlined" 
        sx={{ mb: 1 }} 
        className="no-drag"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <InputLabel 
          htmlFor={id} 
          className="no-drag"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {label}
        </InputLabel>
        <NativeSelect
          value={value}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          inputProps={{
            name: id,
            id: id,
            className: "no-drag"
          }}
          className="no-drag"
        >
          {options.map(option => (
            <option 
              key={option.value} 
              value={option.value} 
              className="no-drag"
              onClick={(e) => e.stopPropagation()}
            >
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </FormControl>
    );
  };

  // Render format-specific options based on input format
  const renderFormatOptions = (
    inputFormat: string, 
    nodeData: DataTransformationNodeData, 
    handleChange: (field: keyof DataTransformationNodeData, value: any) => void
  ) => {
    switch (inputFormat) {
      case 'csv':
        return (
          <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              CSV Options
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {renderNativeSelect(
                'csv-delimiter',
                'Delimiter',
                nodeData.csvOptions?.delimiter || ',',
                [
                  { value: ',', label: 'Comma (,)' },
                  { value: ';', label: 'Semicolon (;)' },
                  { value: '\t', label: 'Tab' },
                  { value: '|', label: 'Pipe (|)' },
                ],
                (newValue) => {
                  const newOptions = { 
                    ...nodeData.csvOptions || { hasHeader: true },
                    delimiter: newValue
                  };
                  handleChange('csvOptions', newOptions);
                }
              )}
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={nodeData.csvOptions?.hasHeader ?? true}
                    size="small"
                    onChange={(e) => {
                      const newOptions = { 
                        ...nodeData.csvOptions || { delimiter: ',' },
                        hasHeader: e.target.checked 
                      };
                      handleChange('csvOptions', newOptions);
                    }}
                  />
                }
                label="Has Header Row"
              />
            </Box>
          </Box>
        );

      case 'excel':
        return (
          <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Excel Options
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              <TextField
                size="small"
                label="Sheet Name"
                placeholder="e.g., Sheet1 (leave empty for first sheet)"
                value={nodeData.excelOptions?.sheetName || ''}
                onChange={(e) => {
                  const newOptions = { 
                    ...nodeData.excelOptions || { headerRow: 1 },
                    sheetName: e.target.value 
                  };
                  handleChange('excelOptions', newOptions);
                }}
                fullWidth
              />
              <TextField
                size="small"
                label="Header Row"
                type="number"
                InputProps={{ inputProps: { min: 1 } }}
                value={nodeData.excelOptions?.headerRow || 1}
                onChange={(e) => {
                  const newOptions = { 
                    ...nodeData.excelOptions || { sheetName: '' },
                    headerRow: parseInt(e.target.value) || 1
                  };
                  handleChange('excelOptions', newOptions);
                }}
              />
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  // Render transformation-specific options
  const renderTransformationOptions = (
    transformations: string[],
    nodeData: DataTransformationNodeData,
    handleChange: (field: keyof DataTransformationNodeData, value: any) => void
  ) => {
    if (transformations.includes('coa_mapping')) {
      return (
        <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="medium" gutterBottom>
            Chart of Accounts Mapping
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            {renderNativeSelect(
              'coa-standard',
              'Standard Chart of Accounts',
              nodeData.coaOptions?.standardChartOfAccounts || 'gaap',
              STANDARD_COA_OPTIONS,
              (newValue) => {
                const newOptions = { 
                  ...nodeData.coaOptions || { mappingMethod: 'automatic' },
                  standardChartOfAccounts: newValue
                };
                handleChange('coaOptions', newOptions);
              }
            )}
            
            {renderNativeSelect(
              'coa-mapping-method',
              'Mapping Method',
              nodeData.coaOptions?.mappingMethod || 'automatic',
              MAPPING_METHODS,
              (newValue) => {
                const newOptions = { 
                  ...nodeData.coaOptions || { standardChartOfAccounts: 'gaap' },
                  mappingMethod: newValue
                };
                handleChange('coaOptions', newOptions);
              }
            )}
          </Box>
        </Box>
      );
    }
    
    if (transformations.includes('subledger_mapping')) {
      return (
        <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="medium" gutterBottom>
            Sub-Ledger Mapping
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            {renderNativeSelect(
              'subledger-type',
              'Sub-Ledger Type',
              nodeData.subLedgerOptions?.subLedgerType || 'fixed_asset',
              SUB_LEDGER_TYPES,
              (newValue) => {
                const newOptions = { 
                  ...nodeData.subLedgerOptions || { mappingMethod: 'automatic', autoSyncToGL: true },
                  subLedgerType: newValue
                };
                handleChange('subLedgerOptions', newOptions);
              }
            )}
            
            {renderNativeSelect(
              'subledger-mapping-method',
              'Mapping Method',
              nodeData.subLedgerOptions?.mappingMethod || 'automatic',
              MAPPING_METHODS,
              (newValue) => {
                const newOptions = { 
                  ...nodeData.subLedgerOptions || { subLedgerType: 'fixed_asset', autoSyncToGL: true },
                  mappingMethod: newValue
                };
                handleChange('subLedgerOptions', newOptions);
              }
            )}
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={nodeData.subLedgerOptions?.autoSyncToGL ?? true}
                  size="small"
                  onChange={(e) => {
                    const newOptions = { 
                      ...nodeData.subLedgerOptions || { subLedgerType: 'fixed_asset', mappingMethod: 'automatic' },
                      autoSyncToGL: e.target.checked 
                    };
                    handleChange('subLedgerOptions', newOptions);
                  }}
                />
              }
              label="Auto-sync to General Ledger"
            />
          </Box>
        </Box>
      );
    }
    
    return null;
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
        ref={nodeRef}
        elevation={2}
        sx={{
          padding: 2,
          width: 300,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with title and help icon - DRAGGABLE */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: 2,
            cursor: 'move',
            padding: '4px',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransformIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">
              {nodeData.label}
            </Typography>
          </Box>
          <Tooltip title={helpText} placement="top" className="no-drag">
            <IconButton size="small" className="no-drag">
              <HelpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Content container - NON-DRAGGABLE */}
        <Box 
          className="no-drag"
          sx={{ 
            position: 'relative',
            pointerEvents: 'all',
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Format indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <Chip 
              icon={<DataIcon fontSize="small" />} 
              label={INPUT_FORMATS.find(f => f.value === nodeData.inputFormat)?.label || 'Input'} 
              size="small"
              variant="outlined"
              className="no-drag"
            />
            <TransformIcon fontSize="small" />
            <Chip 
              icon={<DataIcon fontSize="small" />} 
              label={OUTPUT_FORMATS.find(f => f.value === nodeData.outputFormat)?.label || 'Output'} 
              size="small"
              color="primary"
              variant="outlined"
              className="no-drag"
            />
          </Box>

          {/* Configuration fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} className="no-drag">
            {/* Input Format (using native select for better compatibility) */}
            {renderNativeSelect(
              'input-format',
              'Input Format',
              nodeData.inputFormat,
              INPUT_FORMATS,
              (newValue) => handleChange('inputFormat', newValue)
            )}

            {/* Output Format (using native select for better compatibility) */}
            {renderNativeSelect(
              'output-format',
              'Output Format',
              nodeData.outputFormat,
              OUTPUT_FORMATS,
              (newValue) => handleChange('outputFormat', newValue)
            )}

            {/* Transformations */}
            <Typography variant="body2" gutterBottom>
              Transformations
            </Typography>
            <FormGroup>
              {TRANSFORMATIONS.map(transformation => (
                <FormControlLabel
                  key={transformation.value}
                  control={
                    <Checkbox
                      checked={nodeData.transformations.includes(transformation.value)}
                      onChange={() => handleTransformationToggle(transformation.value)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">{transformation.label}</Typography>}
                />
              ))}
            </FormGroup>

            <Divider sx={{ my: 1 }} />

            {/* Enrichment toggle */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={nodeData.enrichmentEnabled}
                  onChange={(e) => handleChange('enrichmentEnabled', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Enable Data Enrichment</Typography>}
            />

            {/* API Key (only shown if enrichment is enabled) */}
            {nodeData.enrichmentEnabled && (
              <TextField
                fullWidth
                size="small"
                label="Enrichment API Key"
                value={nodeData.enrichmentApiKey}
                onChange={(e) => handleChange('enrichmentApiKey', e.target.value)}
                type="password"
              />
            )}

            {/* Format-specific options */}
            {renderFormatOptions(nodeData.inputFormat, nodeData, handleChange)}

            {/* Transformation-specific options */}
            {renderTransformationOptions(nodeData.transformations, nodeData, handleChange)}
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

export default DataTransformationNode; 