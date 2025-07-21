import React from 'react';
import { Box } from '@mui/material';
import { Provider } from 'react-redux';
import { ReactFlowProvider } from 'reactflow';
import { store } from '../store/store';
import FlowEditorContainer from './FlowEditor/FlowEditorContainer';
import './FlowEditor/flowStyles.css'; // Import custom styles

/**
 * Main Flow Editor component that wraps the editor container with necessary providers
 * This ensures the FlowEditorContainer and its children have access to Redux store 
 * and ReactFlow context
 */
const FlowEditor: React.FC = () => {
  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      width: '100%',
      overflow: 'hidden'
    }}>
      <Provider store={store}>
        <ReactFlowProvider>
          <FlowEditorContainer />
        </ReactFlowProvider>
      </Provider>
    </Box>
  );
};

export default FlowEditor; 