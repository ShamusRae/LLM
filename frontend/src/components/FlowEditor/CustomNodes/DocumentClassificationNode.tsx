/**
 * Document Classification Node
 * 
 * Purpose: To automatically classify document types from various input formats
 * 
 * Features:
 * - Accepts multiple document formats (PDF, CSV, TXT, Excel, Word, PowerPoint, Voice)
 * - Classifies documents into detailed accounting/finance categories
 * - Supports both structured and unstructured document classification
 * - Provides confidence scores for classifications
 * 
 * User Configuration:
 * - Classification threshold
 * - Minimum confidence score
 * - Custom category addition
 * 
 * Help Text: "This node analyzes documents and classifies them into specific accounting 
 * and financial document types, helping organize and route them in your workflow."
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
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  Description as DocumentIcon,
  FindInPage as ClassifyIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as TxtIcon,
  TableChart as SpreadsheetIcon,
  TableChart,
  Summarize as WordIcon,
  Slideshow as PowerPointIcon,
  KeyboardVoice as VoiceIcon,
  Category as CategoryIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

// Document classification output types
enum DocumentCategory {
  STRUCTURED = 'structured',
  UNSTRUCTURED = 'unstructured',
  HYBRID = 'hybrid',
}

export interface DocumentClassificationNodeData {
  id: string;
  label: string;
  confidenceThreshold: number;
  enableDetailedClassification: boolean;
  enableConfidenceScores: boolean;
  customCategories: string[];
  outputFormat: 'simple' | 'detailed';
  structuredTypes: string[];
  unstructuredTypes: string[];
  hybridTypes: string[];
}

// Input document formats
const INPUT_FORMATS = [
  { id: 'pdf', label: 'PDF Document', icon: <PdfIcon /> },
  { id: 'csv', label: 'CSV File', icon: <SpreadsheetIcon /> },
  { id: 'txt', label: 'Text File', icon: <TxtIcon /> },
  { id: 'excel', label: 'Excel Spreadsheet', icon: <SpreadsheetIcon /> },
  { id: 'word', label: 'Word Document', icon: <WordIcon /> },
  { id: 'ppt', label: 'PowerPoint', icon: <PowerPointIcon /> },
  { id: 'voice', label: 'Voice Message', icon: <VoiceIcon /> },
];

// Structured document types
const STRUCTURED_DOCUMENT_TYPES = [
  // Financial Records
  'General Ledger',
  'Trial Balance',
  'Chart of Accounts',
  'Journal Entries',
  'Fixed Asset Register',
  'Depreciation Schedule',
  'Bank Reconciliation',
  'Accounts Receivable Aging',
  'Accounts Payable Aging',
  'Payroll Register',
  'Tax Return',
  'Sales Tax Report',
  
  // Operational & Compliance
  'Inventory Report',
  'Procurement Summary',
  'Purchase Order',
  'Expense Report',
  'Budget vs. Actual Report',
  'Loan Amortization Schedule',
  
  // Regulatory Filings
  'SEC Filing',
  'Statutory Account',
  'VAT/GST Filing',
  'Payroll Tax Filing',
  
  // Audit-Specific
  'Internal Control Matrix',
  'Risk and Compliance Checklist',
  'Sampling Data Report',
];

// Unstructured document types
const UNSTRUCTURED_DOCUMENT_TYPES = [
  // Legal & Contractual
  'Lease Agreement',
  'Lease Addendum',
  'Supplier Contract',
  'Employee Contract',
  'Shareholder Agreement',
  'M&A Agreement',
  'Debt Covenant',
  'NDA',
  'DPA',
  
  // Tax & Benefits
  'Employee Benefit Plan',
  'Pension Plan Document',
  'Trust Agreement',
  'Deferred Compensation Agreement',
  
  // Corporate & Governance
  'Board Minutes',
  'Policies & Procedures',
  'Code of Conduct',
  'Ethics and Compliance Report',
  
  // Financial Statements
  'Annual Report',
  'Financial Statement',
  'MD&A',
  'Audit Report',
  'Due Diligence Report',
  
  // Correspondence
  'Client Letter',
  'Internal Memo',
  'Email Communication',
];

// Hybrid document types
const HYBRID_DOCUMENT_TYPES = [
  'Loan Agreement',
  'Invoice',
  'Insurance Policy',
];

const DocumentClassificationNode: React.FC<NodeProps<DocumentClassificationNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [nodeData, setNodeData] = useState<DocumentClassificationNodeData>({
    id: data.id || '',
    label: data.label || 'Document Classification',
    confidenceThreshold: data.confidenceThreshold || 70,
    enableDetailedClassification: data.enableDetailedClassification ?? true,
    enableConfidenceScores: data.enableConfidenceScores ?? true,
    customCategories: data.customCategories || [],
    outputFormat: data.outputFormat || 'detailed',
    structuredTypes: data.structuredTypes || STRUCTURED_DOCUMENT_TYPES,
    unstructuredTypes: data.unstructuredTypes || UNSTRUCTURED_DOCUMENT_TYPES,
    hybridTypes: data.hybridTypes || HYBRID_DOCUMENT_TYPES,
  });

  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    structured: false,
    unstructured: false,
    hybrid: false,
  });

  // Toggle expanded category sections
  const handleToggleCategory = (category: keyof typeof expandedCategories) => {
    setExpandedCategories({
      ...expandedCategories,
      [category]: !expandedCategories[category]
    });
  };

  // Help text for the tooltip
  const helpText = "This node analyzes documents and classifies them into specific accounting and financial document types, helping organize and route them in your workflow.";

  const handleChange = (field: keyof DocumentClassificationNodeData, value: any) => {
    const updatedData = {
      ...nodeData,
      [field]: value,
    };
    setNodeData(updatedData);
    dispatch(updateNode({ id, data: updatedData }));
  };

  // Handle adding a custom category
  const handleAddCustomCategory = () => {
    if (!newCustomCategory.trim() || nodeData.customCategories.includes(newCustomCategory.trim())) {
      return;
    }
    const updatedCategories = [...nodeData.customCategories, newCustomCategory.trim()];
    handleChange('customCategories', updatedCategories);
    setNewCustomCategory('');
  };

  // Handle removing a custom category
  const handleRemoveCustomCategory = (category: string) => {
    const updatedCategories = nodeData.customCategories.filter(cat => cat !== category);
    handleChange('customCategories', updatedCategories);
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
            <ClassifyIcon fontSize="small" color="primary" />
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

        {/* Supported input formats */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Supported Input Formats:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {INPUT_FORMATS.map(format => (
              <Chip
                key={format.id}
                icon={format.icon}
                label={format.label}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>

        {/* Configuration fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Confidence threshold slider */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Classification Confidence Threshold: {nodeData.confidenceThreshold}%
            </Typography>
            <Slider
              value={nodeData.confidenceThreshold}
              onChange={(_, value) => handleChange('confidenceThreshold', value)}
              min={0}
              max={100}
              step={5}
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>

          {/* Output format */}
          <FormControl fullWidth size="small">
            <InputLabel>Output Format</InputLabel>
            <Select
              value={nodeData.outputFormat}
              label="Output Format"
              onChange={(e) => handleChange('outputFormat', e.target.value)}
            >
              <MenuItem value="simple">Simple (Document Category Only)</MenuItem>
              <MenuItem value="detailed">Detailed (With Full Classification)</MenuItem>
            </Select>
          </FormControl>

          {/* Toggle options */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={nodeData.enableDetailedClassification}
                  onChange={(e) => handleChange('enableDetailedClassification', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Enable Detailed Classification</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={nodeData.enableConfidenceScores}
                  onChange={(e) => handleChange('enableConfidenceScores', e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Show Confidence Scores</Typography>}
            />
          </Box>
          
          <Divider />

          {/* Document Categories */}
          <Typography variant="body2" gutterBottom>
            Document Categories
          </Typography>
          
          {/* Structured Documents */}
          <Box>
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => handleToggleCategory('structured')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableChart fontSize="small" />
                <Typography variant="body2">Structured Documents ({STRUCTURED_DOCUMENT_TYPES.length})</Typography>
              </Box>
              {expandedCategories.structured ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Box>
            <Collapse in={expandedCategories.structured}>
              <Box sx={{ ml: 3, mt: 1, maxHeight: 150, overflow: 'auto' }}>
                <List dense disablePadding>
                  {STRUCTURED_DOCUMENT_TYPES.slice(0, 5).map((type) => (
                    <ListItem key={type} dense disablePadding>
                      <ListItemText primary={type} primaryTypographyProps={{ variant: 'caption' }} />
                    </ListItem>
                  ))}
                  {STRUCTURED_DOCUMENT_TYPES.length > 5 && (
                    <ListItem dense disablePadding>
                      <ListItemText 
                        primary={`+ ${STRUCTURED_DOCUMENT_TYPES.length - 5} more...`} 
                        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} 
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Collapse>
          </Box>
          
          {/* Unstructured Documents */}
          <Box>
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => handleToggleCategory('unstructured')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DocumentIcon fontSize="small" />
                <Typography variant="body2">Unstructured Documents ({UNSTRUCTURED_DOCUMENT_TYPES.length})</Typography>
              </Box>
              {expandedCategories.unstructured ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Box>
            <Collapse in={expandedCategories.unstructured}>
              <Box sx={{ ml: 3, mt: 1, maxHeight: 150, overflow: 'auto' }}>
                <List dense disablePadding>
                  {UNSTRUCTURED_DOCUMENT_TYPES.slice(0, 5).map((type) => (
                    <ListItem key={type} dense disablePadding>
                      <ListItemText primary={type} primaryTypographyProps={{ variant: 'caption' }} />
                    </ListItem>
                  ))}
                  {UNSTRUCTURED_DOCUMENT_TYPES.length > 5 && (
                    <ListItem dense disablePadding>
                      <ListItemText 
                        primary={`+ ${UNSTRUCTURED_DOCUMENT_TYPES.length - 5} more...`} 
                        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} 
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Collapse>
          </Box>
          
          {/* Hybrid Documents */}
          <Box>
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => handleToggleCategory('hybrid')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon fontSize="small" />
                <Typography variant="body2">Hybrid Documents ({HYBRID_DOCUMENT_TYPES.length})</Typography>
              </Box>
              {expandedCategories.hybrid ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Box>
            <Collapse in={expandedCategories.hybrid}>
              <Box sx={{ ml: 3, mt: 1 }}>
                <List dense disablePadding>
                  {HYBRID_DOCUMENT_TYPES.map((type) => (
                    <ListItem key={type} dense disablePadding>
                      <ListItemText primary={type} primaryTypographyProps={{ variant: 'caption' }} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Collapse>
          </Box>
          
          <Divider />
          
          {/* Custom Categories */}
          <Typography variant="body2" gutterBottom>
            Custom Categories
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Add custom category..."
              value={newCustomCategory}
              onChange={(e) => setNewCustomCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCategory()}
            />
            <IconButton 
              size="small" 
              onClick={handleAddCustomCategory}
              color="primary"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <CategoryIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {/* Display custom categories */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {nodeData.customCategories.map((category) => (
              <Chip
                key={category}
                label={category}
                size="small"
                onDelete={() => handleRemoveCustomCategory(category)}
                color="primary"
                variant="outlined"
              />
            ))}
            {nodeData.customCategories.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                No custom categories added
              </Typography>
            )}
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

export default DocumentClassificationNode; 