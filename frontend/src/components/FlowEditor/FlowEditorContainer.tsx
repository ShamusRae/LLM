/**
 * FlowEditorContainer
 * 
 * This is the main container component that holds the FlowEditor and related components
 * like the asset palette and the execution panel.
 */

import React, { useState } from 'react';
import { Box, Grid, Paper, Tabs, Tab } from '@mui/material';
import FlowEditorCanvas from './FlowEditorCanvas';
import AssetPalette from './AssetPalette';
import FlowExecutionPanel from './FlowExecutionPanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sidebar-tabpanel-${index}`}
      aria-labelledby={`sidebar-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `sidebar-tab-${index}`,
    'aria-controls': `sidebar-tabpanel-${index}`,
  };
}

const FlowEditorContainer: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Grid container spacing={0} sx={{ height: '100%' }}>
      {/* Sidebar */}
      <Grid item xs={3} sx={{ height: '100%', borderRight: '1px solid #e0e0e0' }}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="flow editor sidebar tabs"
              sx={{ minHeight: '48px' }}
            >
              <Tab label="Assets" {...a11yProps(0)} />
              <Tab label="Execute" {...a11yProps(1)} />
            </Tabs>
          </Box>
          
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <TabPanel value={tabValue} index={0}>
              <AssetPalette />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <FlowExecutionPanel />
            </TabPanel>
          </Box>
        </Box>
      </Grid>
      
      {/* Main Editor Area */}
      <Grid item xs={9} sx={{ height: '100%' }}>
        <Box sx={{ height: '100%' }}>
          <FlowEditorCanvas />
        </Box>
      </Grid>
    </Grid>
  );
};

export default FlowEditorContainer; 