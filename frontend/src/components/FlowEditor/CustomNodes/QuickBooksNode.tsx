import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, Connection } from 'reactflow';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  AccountBalance as AccountBalanceIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface QuickBooksNodeData {
  id: string;
  label: string;
  apiKey: string;
  permissions: 'readonly' | 'readwrite';
  dataTables: string[];
  isValidating?: boolean;
  isValid?: boolean;
  error?: string;
}

const AVAILABLE_DATA_TABLES = [
  'General Ledger',
  'Chart of Accounts',
  'Trial Balance',
  'Journal Entries',
  'Invoices',
  'Bills',
  'Purchase Orders',
  'Sales Orders',
  'Customers',
  'Vendors',
  'Items',
  'Tax Rates',
  'Tax Codes',
  'Tax Agencies',
  'Tax Payments',
  'Tax Returns',
  'Tax Liabilities',
  'Tax Adjustments',
  'Tax Credits',
  'Tax Deductions',
];

// QuickBooks API Key validation regex
const QUICKBOOKS_API_KEY_REGEX = /^[a-zA-Z0-9]{32}$/;

const QuickBooksNode: React.FC<NodeProps<QuickBooksNodeData>> = ({ 
  data, 
  isConnectable,
  id 
}) => {
  const dispatch = useAppDispatch();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [localData, setLocalData] = useState<QuickBooksNodeData>({
    id: data.id || '',
    label: data.label || 'QuickBooks Integration',
    apiKey: data.apiKey || '',
    permissions: data.permissions || 'readonly',
    dataTables: data.dataTables || [],
    isValidating: false,
    isValid: false,
    error: undefined,
  });

  // Validate API key when it changes
  useEffect(() => {
    if (localData.apiKey) {
      validateApiKey(localData.apiKey);
    }
  }, [localData.apiKey]);

  const handleConfigOpen = () => setIsConfigOpen(true);
  const handleConfigClose = () => setIsConfigOpen(false);

  const validateApiKey = async (apiKey: string) => {
    if (!QUICKBOOKS_API_KEY_REGEX.test(apiKey)) {
      setLocalData(prev => ({
        ...prev,
        isValid: false,
        error: 'Invalid API key format. Must be 32 alphanumeric characters.',
      }));
      return false;
    }

    setLocalData(prev => ({ ...prev, isValidating: true, error: undefined }));

    try {
      // Simulate API validation (replace with actual QuickBooks API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, we'll consider any 32-character key valid
      setLocalData(prev => ({
        ...prev,
        isValid: true,
        isValidating: false,
      }));
      return true;
    } catch (error) {
      setLocalData(prev => ({
        ...prev,
        isValid: false,
        isValidating: false,
        error: 'Failed to validate API key. Please check your connection and try again.',
      }));
      return false;
    }
  };

  const handleSaveConfig = async () => {
    const isValid = await validateApiKey(localData.apiKey);
    if (!isValid) {
      return;
    }

    // Use Redux to update the node data
    dispatch(updateNode({
      id,
      data: {
        ...data,
        label: localData.label,
        apiKey: localData.apiKey,
        permissions: localData.permissions,
        dataTables: localData.dataTables,
        isValid: localData.isValid,
        error: localData.error
      }
    }));

    // Close the modal
    handleConfigClose();
  };

  const handleDataTableToggle = (table: string) => {
    setLocalData((prev) => ({
      ...prev,
      dataTables: prev.dataTables.includes(table)
        ? prev.dataTables.filter((t) => t !== table)
        : [...prev.dataTables, table],
    }));
  };

  // Connection validation
  const validateConnection = (connection: Connection) => {
    const sourceNode = connection.source;
    const targetNode = connection.target;

    // Prevent connections to self
    if (sourceNode === targetNode) {
      return false;
    }

    // Validate based on permissions
    if (localData.permissions === 'readonly') {
      // Read-only nodes can only receive data
      return connection.target === data.id;
    }

    // Read/Write nodes can both receive and send data
    return true;
  };

  return (
    <>
      <Paper
        elevation={2}
        sx={{
          padding: 2,
          minWidth: 300,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {localData.label}
          </Typography>
          <IconButton size="small" onClick={handleConfigOpen}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="API Key"
            value={localData.apiKey}
            onChange={(e) => setLocalData((prev) => ({ ...prev, apiKey: e.target.value }))}
            type="password"
            disabled
            error={!localData.isValid && !!localData.apiKey}
            InputProps={{
              endAdornment: localData.isValidating ? (
                <CircularProgress size={20} />
              ) : localData.isValid ? (
                <CheckCircleIcon color="success" />
              ) : localData.error ? (
                <ErrorIcon color="error" />
              ) : null,
            }}
          />
          {localData.error && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
              {localData.error}
            </Typography>
          )}
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Permissions</InputLabel>
            <Select
              value={localData.permissions}
              label="Permissions"
              onChange={(e) =>
                setLocalData((prev) => ({
                  ...prev,
                  permissions: e.target.value as 'readonly' | 'readwrite',
                }))
              }
              disabled
            >
              <MenuItem value="readonly">Read Only</MenuItem>
              <MenuItem value="readwrite">Read/Write</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Selected Data Tables:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {localData.dataTables.map((table) => (
              <Chip
                key={table}
                label={table}
                size="small"
                onDelete={() => handleDataTableToggle(table)}
                disabled
              />
            ))}
          </Box>
        </Box>

        {isConnectable && (
          <>
            <Handle
              type="target"
              position={Position.Left}
              style={{ background: '#555', width: 8, height: 8 }}
            />
            <Handle
              type="source"
              position={Position.Right}
              style={{ background: '#555', width: 8, height: 8 }}
            />
          </>
        )}
      </Paper>

      <Dialog
        open={isConfigOpen}
        onClose={handleConfigClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>QuickBooks Node Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Node Label"
              value={localData.label}
              onChange={(e) =>
                setLocalData((prev) => ({ ...prev, label: e.target.value }))
              }
            />

            <TextField
              fullWidth
              label="API Key"
              value={localData.apiKey}
              onChange={(e) =>
                setLocalData((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              type="password"
              error={!localData.isValid && !!localData.apiKey}
              helperText={localData.error}
              InputProps={{
                endAdornment: localData.isValidating ? (
                  <CircularProgress size={20} />
                ) : localData.isValid ? (
                  <CheckCircleIcon color="success" />
                ) : localData.error ? (
                  <ErrorIcon color="error" />
                ) : null,
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Permissions</InputLabel>
              <Select
                value={localData.permissions}
                label="Permissions"
                onChange={(e) =>
                  setLocalData((prev) => ({
                    ...prev,
                    permissions: e.target.value as 'readonly' | 'readwrite',
                  }))
                }
              >
                <MenuItem value="readonly">Read Only</MenuItem>
                <MenuItem value="readwrite">Read/Write</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Data Tables
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 1,
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                {AVAILABLE_DATA_TABLES.map((table) => (
                  <Chip
                    key={table}
                    label={table}
                    onClick={() => handleDataTableToggle(table)}
                    color={localData.dataTables.includes(table) ? 'primary' : 'default'}
                    sx={{ justifyContent: 'flex-start' }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfigClose}>Cancel</Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained" 
            color="primary"
            disabled={!localData.isValid}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuickBooksNode; 