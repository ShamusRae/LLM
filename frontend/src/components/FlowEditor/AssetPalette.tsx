import React, { useMemo, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  InputAdornment,
  Typography,
  Divider,
  Collapse,
  ListItemButton,
} from '@mui/material';
import { 
  Search as SearchIcon,
  Input as InputIcon,
  Settings as ProcessIcon,
  Output as OutputIcon,
  AccountBalance as AccountBalanceIcon,
  ExpandLess,
  ExpandMore,
  Map as MapIcon,
  Public as WebSearchIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as SpreadsheetIcon,
  Code as CodeIcon,
  Chat as ChatIcon,
  Api as ApiIcon,
  Transform as TransformIcon,
  CallSplit as ForkIcon,
  Error as ErrorIcon,
  BarChart as AnalyticsIcon,
  Notifications as NotificationIcon,
  FindInPage as ClassifyIcon,
} from '@mui/icons-material';

export interface Asset {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  subtype?: string;
  options?: Record<string, any>;
}

// Data Feed Assets
const dataFeedAssets: Asset[] = [
  {
    id: 'google-maps-search',
    name: 'Google Maps',
    description: 'Search for locations and get geographic data',
    category: 'Data Feed',
    icon: 'map',
  },
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for information',
    category: 'Data Feed',
    icon: 'web',
  },
  {
    id: 'weather-api',
    name: 'Weather API',
    description: 'Get current weather and forecasts',
    category: 'Data Feed',
    icon: 'weather',
  },
  {
    id: 'news-api',
    name: 'News API',
    description: 'Get latest news from various sources',
    category: 'Data Feed',
    icon: 'news',
  },
];

// File Upload Assets
const fileUploadAssets: Asset[] = [
  {
    id: 'file-upload-any',
    name: 'Generic File Upload',
    description: 'Upload any file type',
    category: 'File Input',
    icon: 'file',
    subtype: 'any',
  },
  {
    id: 'file-upload-txt',
    name: 'Text File Upload',
    description: 'Upload .txt files',
    category: 'File Input',
    icon: 'text_file',
    subtype: 'txt',
  },
  {
    id: 'file-upload-csv',
    name: 'CSV File Upload',
    description: 'Upload .csv files',
    category: 'File Input',
    icon: 'csv_file',
    subtype: 'csv',
  },
  {
    id: 'file-upload-excel',
    name: 'Excel File Upload',
    description: 'Upload Excel spreadsheets',
    category: 'File Input',
    icon: 'excel_file',
    subtype: 'excel',
  },
  {
    id: 'file-upload-word',
    name: 'Word Document Upload',
    description: 'Upload Word documents',
    category: 'File Input',
    icon: 'word_file',
    subtype: 'word',
  },
  {
    id: 'file-upload-pdf',
    name: 'PDF Upload',
    description: 'Upload PDF documents',
    category: 'File Input',
    icon: 'pdf_file',
    subtype: 'pdf',
  },
];

// Processing and Output Assets
const processingAssets: Asset[] = [
  {
    id: 'input',
    name: 'Input Node',
    description: 'Start point for data flow',
    category: 'Processing',
    icon: 'input',
  },
  {
    id: 'process',
    name: 'Process Node',
    description: 'Transform or process data',
    category: 'Processing',
    icon: 'process',
  },
  {
    id: 'output',
    name: 'Output Node',
    description: 'End point for data flow',
    category: 'Processing',
    icon: 'output',
  },
  {
    id: 'documentclassification',
    name: 'Document Classification',
    description: 'Classify documents into accounting categories',
    category: 'Processing',
    icon: 'classify',
  },
  {
    id: 'llmprompt',
    name: 'LLM Prompt',
    description: 'Send a prompt to an LLM',
    category: 'Processing',
    icon: 'chat',
  },
  {
    id: 'chatinterface',
    name: 'Chat Interface',
    description: 'Interactive chat UI',
    category: 'Processing',
    icon: 'chat',
  },
  {
    id: 'microservices',
    name: 'Microservices',
    description: 'Call our existing microservices',
    category: 'Processing',
    icon: 'api',
  },
  {
    id: 'datatransformation',
    name: 'Data Transformation',
    description: 'Transform accounting data for reporting and analysis',
    category: 'Processing',
    icon: 'transform',
  },
  {
    id: 'conditional',
    name: 'Conditional Logic',
    description: 'Add branching logic',
    category: 'Processing',
    icon: 'fork',
  },
  {
    id: 'customscripting',
    name: 'Custom Script',
    description: 'Run custom code',
    category: 'Processing',
    icon: 'code',
  },
  {
    id: 'errorhandling',
    name: 'Error Handling',
    description: 'Handle errors and logging',
    category: 'Processing',
    icon: 'error',
  },
  {
    id: 'analytics',
    name: 'Analytics & Visualization',
    description: 'Create visual reports',
    category: 'Processing',
    icon: 'analytics',
  },
  {
    id: 'notification',
    name: 'Notification',
    description: 'Send alerts and notifications',
    category: 'Processing',
    icon: 'notification',
  },
];

// Integration Assets
const integrationAssets: Asset[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Connect to QuickBooks API',
    category: 'Integration',
    icon: 'account_balance',
  },
];

// Combine all assets
const allAssets: Asset[] = [
  ...dataFeedAssets,
  ...fileUploadAssets,
  ...processingAssets,
  ...integrationAssets,
];

// Map asset IDs to their respective icon components
const getIconForAsset = (asset: Asset) => {
  // Data feed icons
  if (asset.id === 'google-maps-search') return <MapIcon />;
  if (asset.id === 'web-search') return <WebSearchIcon />;
  
  // File upload icons
  if (asset.id.startsWith('file-upload')) {
    if (asset.subtype === 'pdf') return <PdfIcon />;
    if (asset.subtype === 'excel') return <SpreadsheetIcon />;
    if (asset.subtype === 'word') return <DocIcon />;
    if (asset.subtype === 'csv') return <SpreadsheetIcon />;
    if (asset.subtype === 'txt') return <FileIcon />;
    return <FileIcon />; // Generic file icon
  }
  
  // Processing icons
  switch (asset.id) {
    case 'input': return <InputIcon />;
    case 'process': return <ProcessIcon />;
    case 'output': return <OutputIcon />;
    case 'quickbooks': return <AccountBalanceIcon />;
    case 'llmprompt': return <ChatIcon />;
    case 'chatinterface': return <ChatIcon />;
    case 'microservices': return <ApiIcon />;
    case 'datatransformation': return <TransformIcon />;
    case 'conditional': return <ForkIcon />;
    case 'customscripting': return <CodeIcon />;
    case 'errorhandling': return <ErrorIcon />;
    case 'analytics': return <AnalyticsIcon />;
    case 'notification': return <NotificationIcon />;
    case 'documentclassification': return <ClassifyIcon />;
    default: return <ProcessIcon />;
  }
};

const AssetPalette: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Data Feed': true,
    'File Input': true,
    'Processing': true,
    'Integration': true,
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const filteredAssets = useMemo(() => {
    return allAssets.filter((asset) => {
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || asset.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    return Array.from(new Set(allAssets.map((asset) => asset.category)));
  }, []);

  // Group assets by category
  const assetsByCategory = useMemo(() => {
    const grouped: Record<string, Asset[]> = {};
    filteredAssets.forEach(asset => {
      if (!grouped[asset.category]) {
        grouped[asset.category] = [];
      }
      grouped[asset.category].push(asset);
    });
    return grouped;
  }, [filteredAssets]);

  const handleDragStart = (event: React.DragEvent, asset: Asset) => {
    console.log("Drag started for asset:", asset);
    event.dataTransfer.setData('application/json', JSON.stringify(asset));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search assets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {categories.map((category) => (
          <Typography
            key={category}
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1,
              cursor: 'pointer',
              backgroundColor:
                selectedCategory === category
                  ? 'primary.main'
                  : 'action.hover',
              color:
                selectedCategory === category
                  ? 'primary.contrastText'
                  : 'text.primary',
            }}
            onClick={() =>
              setSelectedCategory(
                selectedCategory === category ? null : category
              )
            }
          >
            {category}
          </Typography>
        ))}
      </Box>

      <Divider />

      <List sx={{ flex: 1, overflow: 'auto' }}>
        {Object.entries(assetsByCategory).map(([category, assets]) => (
          <React.Fragment key={category}>
            <ListItemButton onClick={() => toggleCategory(category)}>
              <ListItemText primary={category} />
              {expandedCategories[category] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={expandedCategories[category]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {assets.map((asset) => (
                  <ListItem
                    key={asset.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, asset)}
                    sx={{
                      cursor: 'grab',
                      pl: 4,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon>
                      {getIconForAsset(asset)}
                    </ListItemIcon>
                    <ListItemText
                      primary={asset.name}
                      secondary={asset.description}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default AssetPalette; 