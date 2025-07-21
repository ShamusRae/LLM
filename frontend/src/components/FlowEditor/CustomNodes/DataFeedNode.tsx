import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { 
  Map as MapIcon,
  Public as WebSearchIcon,
  Settings as SettingsIcon,
  Cloud as WeatherIcon,
  Article as NewsIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateNode } from '../../../store/flowSlice';

export interface DataFeedNodeData {
  id: string;
  label: string;
  description?: string;
  feedType: string;
  config: Record<string, any>;
}

// Get the appropriate icon based on feed type
const getFeedIcon = (feedType: string) => {
  switch (feedType) {
    case 'google-maps-search':
      return <MapIcon />;
    case 'web-search':
      return <WebSearchIcon />;
    case 'weather-api':
      return <WeatherIcon />;
    case 'news-api':
      return <NewsIcon />;
    default:
      return <WebSearchIcon />;
  }
};

// Configuration fields for each feed type
const getFeedConfigFields = (feedType: string, config: Record<string, any>, handleChange: (key: string, value: any) => void) => {
  switch (feedType) {
    case 'google-maps-search':
      return (
        <>
          <TextField
            fullWidth
            margin="normal"
            label="Default Location"
            value={config.defaultLocation || ''}
            onChange={(e) => handleChange('defaultLocation', e.target.value)}
            placeholder="e.g., New York, NY"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Search Radius (km)"
            type="number"
            value={config.searchRadius || 10}
            onChange={(e) => handleChange('searchRadius', e.target.value)}
          />
        </>
      );
    case 'web-search':
      return (
        <>
          <TextField
            fullWidth
            margin="normal"
            label="Default Query"
            value={config.defaultQuery || ''}
            onChange={(e) => handleChange('defaultQuery', e.target.value)}
            placeholder="e.g., financial news"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Max Results"
            type="number"
            value={config.maxResults || 10}
            onChange={(e) => handleChange('maxResults', e.target.value)}
          />
        </>
      );
    case 'weather-api':
      return (
        <>
          <TextField
            fullWidth
            margin="normal"
            label="Default Location"
            value={config.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="e.g., New York, NY"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Forecast Type</InputLabel>
            <Select
              value={config.forecastType || 'current'}
              label="Forecast Type"
              onChange={(e) => handleChange('forecastType', e.target.value)}
            >
              <MenuItem value="current">Current Weather</MenuItem>
              <MenuItem value="daily">Daily Forecast</MenuItem>
              <MenuItem value="hourly">Hourly Forecast</MenuItem>
            </Select>
          </FormControl>
        </>
      );
    case 'news-api':
      return (
        <>
          <TextField
            fullWidth
            margin="normal"
            label="Keywords"
            value={config.keywords || ''}
            onChange={(e) => handleChange('keywords', e.target.value)}
            placeholder="e.g., finance, business"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              value={config.category || 'general'}
              label="Category"
              onChange={(e) => handleChange('category', e.target.value)}
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="business">Business</MenuItem>
              <MenuItem value="technology">Technology</MenuItem>
              <MenuItem value="science">Science</MenuItem>
              <MenuItem value="health">Health</MenuItem>
              <MenuItem value="sports">Sports</MenuItem>
              <MenuItem value="entertainment">Entertainment</MenuItem>
            </Select>
          </FormControl>
        </>
      );
    default:
      return null;
  }
};

const DataFeedNode: React.FC<NodeProps<DataFeedNodeData>> = ({ 
  id, 
  data, 
  selected, 
  isConnectable 
}) => {
  const dispatch = useAppDispatch();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(data.config || {});

  const handleConfigOpen = () => setIsConfigOpen(true);
  const handleConfigClose = () => setIsConfigOpen(false);

  const handleConfigChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfig = () => {
    dispatch(updateNode({ 
      id, 
      data: { 
        ...data, 
        config: localConfig 
      } 
    }));
    handleConfigClose();
  };

  return (
    <>
      {/* Output handle - only one allowed */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        isConnectable={isConnectable}
        style={{ 
          background: '#555', 
          width: 10, 
          height: 10,
        }}
      />

      <Paper
        elevation={2}
        sx={{
          padding: 2,
          width: 200,
          backgroundColor: selected ? '#f0f7ff' : '#f8f9fa',
          border: '1px solid',
          borderColor: selected ? 'primary.main' : '#e0e0e0',
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getFeedIcon(data.feedType)}
            <Typography variant="subtitle1" fontWeight="medium">
              {data.label}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleConfigOpen}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {data.description || `Data feed from ${data.label}`}
        </Typography>
      </Paper>

      {/* Configuration Dialog */}
      <Dialog 
        open={isConfigOpen} 
        onClose={handleConfigClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configure {data.label}</DialogTitle>
        <DialogContent>
          {getFeedConfigFields(data.feedType, localConfig, handleConfigChange)}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfigClose}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DataFeedNode; 