/**
 * Flow Execution Panel
 * 
 * This component renders a panel for executing flows and displaying the results.
 * It leverages the AssetExecutionService to standardize asset execution across different types.
 */

import React, { useState, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
  ErrorOutline as ErrorIcon,
  ArrowForward as ArrowForwardIcon,
  InfoOutlined as InfoIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { useAppSelector } from '../../store/hooks';
import { AssetOutput, AssetExecutionService } from '../../assets';
import { LLMService } from '../../services/llmService';
import { FileUploadExecutorComponent } from '../../assets';

// Component for rendering outputs based on their type
const OutputRenderer = ({ output }: { output: AssetOutput }) => {
  if (output.error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">{output.error}</Typography>
      </Alert>
    );
  }

  if (output.type === 'markdown' && typeof output.content === 'string') {
    return (
      <Box sx={{ overflow: 'auto', maxHeight: '300px' }}>
        <ReactMarkdown>{output.content}</ReactMarkdown>
      </Box>
    );
  }

  if (output.type === 'json') {
    return (
      <Box 
        component="pre" 
        sx={{ 
          bgcolor: '#f5f5f5', 
          p: 2, 
          borderRadius: 1, 
          overflow: 'auto',
          maxHeight: '300px',
          fontSize: '0.875rem'
        }}
      >
        {JSON.stringify(output.content, null, 2)}
      </Box>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      Unknown output format
    </Typography>
  );
};

// Component for rendering a single asset execution result
const AssetResult = ({ 
  nodeId, 
  output, 
  nodeName 
}: { 
  nodeId: string; 
  output: AssetOutput; 
  nodeName: string;
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleAccordionToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <Accordion 
      expanded={expanded} 
      onChange={handleAccordionToggle}
      sx={{ mb: 1 }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel-${nodeId}-content`}
        id={`panel-${nodeId}-header`}
      >
        <Typography sx={{ width: '33%', flexShrink: 0, fontWeight: output.error ? 'bold' : 'normal' }}>
          {nodeName}
        </Typography>
        <Typography sx={{ color: output.error ? 'error.main' : 'text.secondary' }}>
          {output.error ? 'Error' : `${output.type.toUpperCase()} Output`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <OutputRenderer output={output} />
        
        {output.metadata && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Metadata
            </Typography>
            <Box 
              component="pre" 
              sx={{ 
                bgcolor: '#f5f5f5', 
                p: 2, 
                borderRadius: 1, 
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '0.75rem'
              }}
            >
              {JSON.stringify(output.metadata, null, 2)}
            </Box>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

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
      id={`execution-tabpanel-${index}`}
      aria-labelledby={`execution-tab-${index}`}
      {...other}
      style={{ height: '100%', overflow: 'auto' }}
    >
      {value === index && <Box sx={{ p: 2, height: '100%' }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `execution-tab-${index}`,
    'aria-controls': `execution-tabpanel-${index}`,
  };
}

const FlowExecutionPanel: React.FC = () => {
  // Move service initialization inside the component so it only happens after Redux is ready
  const llmService = React.useMemo(() => new LLMService(), []);
  const assetExecutionService = React.useMemo(() => new AssetExecutionService(llmService), [llmService]);
  
  // Access Redux state using the selector hook
  const { nodes, edges } = useAppSelector((state) => state.flow);
  const { getNode } = useReactFlow();
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<Record<string, AssetOutput>>({});
  const [selectedStartNode, setSelectedStartNode] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog state for file upload execution
  const [isExecutorDialogOpen, setIsExecutorDialogOpen] = useState(false);
  const [currentExecutingNode, setCurrentExecutingNode] = useState<any>(null);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Find potential start nodes (nodes with no incoming connections)
  const startNodes = React.useMemo(() => {
    const nodesWithIncomingEdges = new Set(edges.map(edge => edge.target));
    return nodes.filter(node => !nodesWithIncomingEdges.has(node.id));
  }, [nodes, edges]);

  // Auto-select the first start node if available
  useEffect(() => {
    if (startNodes.length > 0 && !selectedStartNode) {
      setSelectedStartNode(startNodes[0].id);
    }
  }, [startNodes, selectedStartNode]);

  const handleSelectStartNode = (nodeId: string) => {
    setSelectedStartNode(nodeId);
    setResults({}); // Clear previous results
    setExecutionError(null);
  };

  const handleOpenExecutorDialog = (node: any) => {
    setCurrentExecutingNode(node);
    setIsExecutorDialogOpen(true);
  };

  const handleCloseExecutorDialog = () => {
    setIsExecutorDialogOpen(false);
  };

  const handleAssetResult = (nodeId: string, output: AssetOutput) => {
    setResults(prev => ({
      ...prev,
      [nodeId]: output
    }));
    // Close the dialog after processing is complete
    setIsExecutorDialogOpen(false);
  };

  const handleExecuteFlow = async () => {
    if (!selectedStartNode) {
      setExecutionError('Please select a start node for execution');
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);
    setResults({});

    try {
      // Process nodes that require UI interaction first (like file upload)
      for (const node of nodes) {
        if (node.type === 'fileupload') {
          handleOpenExecutorDialog(node);
          // Stop automatic execution to wait for user interaction
          return;
        }
      }

      // For nodes that don't require UI interaction, execute the flow automatically
      const executionResults = await assetExecutionService.executeFlow(
        nodes,
        edges,
        selectedStartNode
      );
      setResults(executionResults);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExecutionError(`Flow execution failed: ${errorMessage}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStopExecution = () => {
    // Ideally, we would cancel in-progress executions here
    setIsExecuting(false);
    setExecutionError('Execution was manually stopped');
  };

  const handleClearResults = () => {
    setResults({});
    setExecutionError(null);
  };

  const exportResults = () => {
    const resultData = JSON.stringify(results, null, 2);
    const blob = new Blob([resultData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow-execution-results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Determine which executor component to render based on node type
  const renderExecutorComponent = () => {
    if (!currentExecutingNode) return null;

    switch (currentExecutingNode.type) {
      case 'fileupload':
        return (
          <FileUploadExecutorComponent
            nodeData={currentExecutingNode.data}
            onResult={(output) => handleAssetResult(currentExecutingNode.id, output)}
            executing={isExecuting}
          />
        );
      default:
        return (
          <Alert severity="warning">
            No UI executor available for node type: {currentExecutingNode.type}
          </Alert>
        );
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e0e0e0',
        borderRadius: 1,
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="execution panel tabs">
          <Tab label="Execute" {...a11yProps(0)} />
          <Tab label="Results" {...a11yProps(1)} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Flow Execution
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Select a starting point and execute the flow to see the results.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Start Node
            </Typography>
            
            {startNodes.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {startNodes.map((node) => (
                  <Button
                    key={node.id}
                    variant={selectedStartNode === node.id ? "contained" : "outlined"}
                    size="small"
                    onClick={() => handleSelectStartNode(node.id)}
                    startIcon={<PlayIcon fontSize="small" />}
                  >
                    {node.data.label || `Node ${node.id}`}
                  </Button>
                ))}
              </Stack>
            ) : (
              <Alert severity="warning">
                No start nodes found. Create a node with no incoming connections.
              </Alert>
            )}
          </Box>
          
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={isExecuting ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
              onClick={handleExecuteFlow}
              disabled={isExecuting || !selectedStartNode}
            >
              {isExecuting ? 'Executing...' : 'Execute Flow'}
            </Button>
            
            {isExecuting && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopExecution}
              >
                Stop
              </Button>
            )}
            
            {Object.keys(results).length > 0 && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleClearResults}
              >
                Clear Results
              </Button>
            )}
          </Stack>
          
          {executionError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {executionError}
            </Alert>
          )}
          
          {Object.keys(results).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  Execution Results
                </Typography>
                <Tooltip title="Download results as JSON">
                  <IconButton size="small" onClick={exportResults}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              
              <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                {Object.entries(results).map(([nodeId, output]) => {
                  const node = getNode(nodeId);
                  return (
                    <AssetResult
                      key={nodeId}
                      nodeId={nodeId}
                      output={output}
                      nodeName={node?.data.label || `Node ${nodeId}`}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Flow Visualization
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            A visualization of the flow execution path and results will appear here.
          </Typography>
          
          {/* In a future implementation, this could show a visual representation of the flow execution */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <InfoIcon />
              <Typography variant="body2">
                Flow visualization is under development. Check back soon for a visual representation of your flow execution.
              </Typography>
            </Stack>
          </Alert>
        </Box>
      </TabPanel>

      {/* Asset Executor Dialog - Used for assets that require UI interaction like file upload */}
      <Dialog
        open={isExecutorDialogOpen}
        onClose={handleCloseExecutorDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: { height: '80vh' } // Make the dialog reasonably large
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {currentExecutingNode?.data?.label || 'Asset Execution'}
            </Typography>
            <IconButton onClick={handleCloseExecutorDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: 'calc(100% - 120px)' }}>
          {renderExecutorComponent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExecutorDialog}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default FlowExecutionPanel; 