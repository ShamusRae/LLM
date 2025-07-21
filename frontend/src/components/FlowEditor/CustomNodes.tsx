import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  AccountBalance as QuickBooksIcon,
  Chat as ChatIcon,
  Api as ApiIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Asset } from './AssetPalette';
import QuickBooksNode from './CustomNodes/QuickBooksNode';

const getNodeIcon = (category: Asset['category']) => {
  switch (category) {
    case 'integration':
      return <QuickBooksIcon />;
    case 'ai':
      return <ChatIcon />;
    case 'connector':
      return <ApiIcon />;
    default:
      return null;
  }
};

const getNodeColor = (category: Asset['category']) => {
  switch (category) {
    case 'integration':
      return '#1976d2'; // Blue
    case 'ai':
      return '#2e7d32'; // Green
    case 'connector':
      return '#ed6c02'; // Orange
    default:
      return '#757575'; // Grey
  }
};

const CustomNode = memo(({ data, isConnectable }: NodeProps) => {
  const asset = data.asset as Asset;
  const color = getNodeColor(asset.category);
  const icon = getNodeIcon(asset.category);

  return (
    <Paper
      elevation={2}
      sx={{
        padding: 2,
        minWidth: 200,
        border: '2px solid',
        borderColor: color,
        backgroundColor: 'background.paper',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      {isConnectable && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            style={{ background: color }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            style={{ background: color }}
          />
        </>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box
          sx={{
            color,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flex: 1,
          }}
        >
          {icon}
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 500,
              color: 'text.primary',
            }}
          >
            {data.label}
          </Typography>
        </Box>
        <Tooltip title="More options">
          <IconButton size="small">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          display: 'block',
        }}
      >
        {asset.description}
      </Typography>
    </Paper>
  );
});

CustomNode.displayName = 'CustomNode';

export const nodeTypes = {
  custom: CustomNode,
  quickbooks: QuickBooksNode,
}; 