import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  Node,
  Edge,
  Connection,
  addEdge,
  NodeChange,
  EdgeChange,
  ConnectionMode,
  MarkerType,
  SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  Group as GroupIcon,
  CallSplit as UngroupIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  ErrorOutline as ErrorIcon,
  FolderOpen as OpenIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setNodes,
  setEdges,
  addNode,
  updateNode,
  removeNode,
  addEdge as addFlowEdge,
  removeEdge,
  undo,
  redo,
  loadFlow,
  clearFlow,
  markAsSaved,
  groupNodes,
  ungroupNodes,
} from '../../store/flowSlice';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Asset } from './AssetPalette';
import { flowService } from '../../services/flowService';
import QuickBooksNode, { QuickBooksNodeData } from './CustomNodes/QuickBooksNode';
import GroupNode, { GroupNodeData } from './CustomNodes/GroupNode';
import DataFeedNode, { DataFeedNodeData } from './CustomNodes/DataFeedNode';
import FileUploadNode, { FileUploadNodeData } from './CustomNodes/FileUploadNode';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import LLMPromptNode, { LLMPromptNodeData } from './CustomNodes/LLMPromptNode';
import ChatInterfaceNode, { ChatInterfaceNodeData } from './CustomNodes/ChatInterfaceNode';
import MicroservicesNode, { MicroservicesNodeData } from './CustomNodes/MicroservicesNode';
import DataTransformationNode, { DataTransformationNodeData } from './CustomNodes/DataTransformationNode';
import ConditionalNode, { ConditionalNodeData } from './CustomNodes/ConditionalNode';
import CustomScriptingNode, { CustomScriptingNodeData } from './CustomNodes/CustomScriptingNode';
import ErrorHandlingNode, { ErrorHandlingNodeData } from './CustomNodes/ErrorHandlingNode';
import AnalyticsNode, { AnalyticsNodeData } from './CustomNodes/AnalyticsNode';
import NotificationNode, { NotificationNodeData } from './CustomNodes/NotificationNode';
import DocumentClassificationNode, { DocumentClassificationNodeData } from './CustomNodes/DocumentClassificationNode';

// Node types
const nodeTypes = {
  quickbooks: QuickBooksNode,
  group: GroupNode,
  datafeed: DataFeedNode,
  fileupload: FileUploadNode,
  llmprompt: LLMPromptNode,
  chatinterface: ChatInterfaceNode,
  microservices: MicroservicesNode,
  datatransformation: DataTransformationNode,
  conditional: ConditionalNode,
  customscripting: CustomScriptingNode,
  errorhandling: ErrorHandlingNode,
  analytics: AnalyticsNode,
  notification: NotificationNode,
  documentclassification: DocumentClassificationNode,
};

// For document classification
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
  'Financial Report',
];

const UNSTRUCTURED_DOCUMENT_TYPES = [
  'Lease Agreement',
  'Supplier Contract',
  'Annual Report',
  'Client Letter',
];

const HYBRID_DOCUMENT_TYPES = [
  'Loan Agreement',
  'Invoice',
  'Insurance Policy',
];

// Error boundary fallback component
const FlowEditorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <Paper 
    elevation={0}
    sx={{
      p: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    }}
  >
    <ErrorIcon color="error" sx={{ fontSize: 64 }} />
    <Typography variant="h5" color="error" gutterBottom>
      Something went wrong in the Flow Editor
    </Typography>
    <Typography variant="body1" color="text.secondary" gutterBottom align="center" sx={{ maxWidth: 600 }}>
      {error.message}
    </Typography>
    <Button variant="contained" onClick={resetErrorBoundary} startIcon={<span>🔄</span>}>
      Reset Editor
    </Button>
  </Paper>
);

// Renamed to FlowEditorCanvas to avoid naming conflicts
const FlowEditorCanvas: React.FC = () => {
  const dispatch = useAppDispatch();
  const { nodes, edges, isModified, currentFlowName, currentFlowDescription } = useAppSelector((state) => state.flow);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedFlows, setSavedFlows] = useState<Array<{id: string, name: string, description: string, updatedAt: string}>>([]);
  const [selectedFlow, setSelectedFlow] = useState<string>('');
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('Group');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false);

  const { project, fitView, zoomIn, zoomOut, getNode, getNodes } = useReactFlow();

  // Log when the component mounts to verify the ref is created
  useEffect(() => {
    console.log("FlowEditor mounted, reactFlowWrapper:", reactFlowWrapper);
  }, []);

  // Edge validation rules
  const isValidConnection = useCallback((connection: Connection) => {
    // Check if we're not connecting a node to itself
    if (connection.source === connection.target) {
      return false;
    }

    // Get source and target nodes
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (!sourceNode || !targetNode) {
      return false;
    }

    // Check if there's already a connection between these nodes
    const existingEdge = edges.find(
      edge => edge.source === connection.source && edge.target === connection.target
    );

    if (existingEdge) {
      return false;
    }

    // Add more validation rules as needed for specific node types
    if (sourceNode.type === 'quickbooks' && targetNode.type === 'quickbooks') {
      // Check specific QuickBooks node connection rules
      // For example, validate source.data.apiPermissions include what target node needs
      const sourceData = sourceNode.data as QuickBooksNodeData;
      const targetData = targetNode.data as QuickBooksNodeData;
      
      // Example validation: source must have API permissions that target requires
      return true; // Simplified for now
    }

    return true;
  }, [nodes, edges]);

  // Handle node changes
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const updatedNodes = [...nodes];
    
    for (const change of changes) {
      if (change.type === 'remove') {
        dispatch(removeNode(change.id));
        return; // Let Redux handle node removal and associated edges
      }
    }
    
    // For position and selection changes, update through setNodes
    dispatch(setNodes(
      updatedNodes.map(node => {
        const change = changes.find(c => {
          if ('id' in c) {
            return c.id === node.id;
          }
          return false;
        });
        if (change?.type === 'position' && 'position' in change && change.position) {
          return { ...node, position: change.position };
        }
        if (change?.type === 'select') {
          return { ...node, selected: change.selected };
        }
        return node;
      })
    ));
  }, [dispatch, nodes]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const updatedEdges = [...edges];
    
    for (const change of changes) {
      if (change.type === 'remove') {
        dispatch(removeEdge(change.id));
        return; // Let Redux handle edge removal
      }
    }
    
    // For selection changes, update through setEdges
    dispatch(setEdges(
      updatedEdges.map(edge => {
        const change = changes.find(c => {
          if ('id' in c) {
            return c.id === edge.id;
          }
          return false;
        });
        if (change?.type === 'select') {
          return { ...edge, selected: change.selected };
        }
        return edge;
      })
    ));
  }, [dispatch, edges]);

  // Handle connections
  const handleConnect = useCallback((connection: Connection) => {
    if (!isValidConnection(connection)) {
      setSnackbar({
        open: true,
        message: 'Invalid connection. Please check node compatibility.',
        severity: 'warning',
      });
      return;
    }

    const newEdge = {
      ...connection,
      id: `e${connection.source}-${connection.target}`,
      markerEnd: { type: MarkerType.ArrowClosed },
      type: 'default',
    };
    
    dispatch(addFlowEdge(newEdge as Edge));
  }, [dispatch, isValidConnection]);

  // DnD handling
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      console.log("onDrop event triggered");

      if (!reactFlowWrapper.current) {
        console.error("reactFlowWrapper.current is not available");
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const assetData = event.dataTransfer.getData('application/json');
      
      console.log("Dropped asset data:", assetData);
      
      if (!assetData) {
        console.error("No asset data in drop event");
        return;
      }
      
      try {
        const asset = JSON.parse(assetData) as Asset;
        console.log("Parsed asset:", asset);
        
        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
        console.log("Calculated position:", position);

        let nodeType = 'default';
        let nodeData: any = { label: asset.name };

        // Determine node type and data based on asset type
        switch (asset.id) {
          case 'quickbooks':
            nodeType = 'quickbooks';
            nodeData = {
              label: asset.name,
              apiKey: '',
              permissions: 'readonly',
              dataTables: [],
            };
            break;
            
          case 'llmprompt':
            nodeType = 'llmprompt';
            nodeData = {
              label: asset.name || 'LLM Prompt',
              provider: 'openai',
              memoryTokens: 4000,
              enabledTools: [],
              fileUploadEnabled: false,
            };
            break;
            
          case 'chatinterface':
            nodeType = 'chatinterface';
            nodeData = {
              label: asset.name || 'Chat Interface',
              chatTitle: 'AI Assistant',
              defaultPrompt: 'How can I help you today?',
              darkMode: false,
            };
            break;
            
          case 'microservices':
            nodeType = 'microservices';
            nodeData = {
              label: asset.name || 'Microservice',
              serviceType: 'data-processing',
              endpoint: 'https://api.example.com/service',
              authToken: '',
              parameters: {},
            };
            break;
            
          case 'datatransformation':
            nodeType = 'datatransformation';
            nodeData = {
              label: asset.name || 'Data Transformation',
              inputFormat: 'json',
              outputFormat: 'json',
              transformations: ['clean'],
              enrichmentApiKey: '',
              enrichmentEnabled: false,
              subLedgerOptions: {
                subLedgerType: 'fixed_asset',
                mappingMethod: 'automatic',
                autoSyncToGL: true
              }
            };
            break;
            
          case 'conditional':
            nodeType = 'conditional';
            nodeData = {
              label: asset.name || 'Decision',
              conditionType: 'expression',
              condition: '',
              property: '',
              operator: 'eq',
              value: '',
              ifTrueLabel: 'True',
              ifFalseLabel: 'False',
            };
            break;
            
          case 'customscripting':
            nodeType = 'customscripting';
            nodeData = {
              label: asset.name || 'Custom Script',
              language: 'javascript',
              code: '// Your code here',
              timeout: 5000,
            };
            break;
            
          case 'errorhandling':
            nodeType = 'errorhandling';
            nodeData = {
              label: asset.name || 'Error Handling',
              retryCount: 3,
              logLevel: 'info',
              sendToBackend: false,
              errorHandlingMode: 'retry',
              logs: [
                {
                  timestamp: new Date().toISOString(),
                  level: 'info',
                  message: 'Error handling node initialized',
                },
              ],
            };
            break;
            
          case 'analytics':
            nodeType = 'analytics';
            nodeData = {
              label: asset.name || 'Analytics',
              chartType: 'bar',
              dataFields: ['revenue', 'time'],
              colorScheme: 'default',
              title: 'Analytics Report',
              xAxisLabel: 'Time',
              yAxisLabel: 'Value',
              showLegend: true,
              aggregationType: 'sum',
            };
            break;
            
          case 'notification':
            nodeType = 'notification';
            nodeData = {
              label: asset.name || 'Notification',
              channel: 'email',
              recipients: [],
              subject: 'Notification from workflow',
              messageTemplate: 'Hello {{user_name}},\n\nThis is an automated notification from the system.\n\nBest regards,\nThe System',
              isScheduled: false,
              scheduleTime: '',
              priority: 'medium',
              variables: { user_name: true, date: true },
            };
            break;
            
          case 'documentclassification':
            nodeType = 'documentclassification';
            nodeData = {
              label: asset.name || 'Document Classification',
              confidenceThreshold: 70,
              enableDetailedClassification: true,
              enableConfidenceScores: true,
              customCategories: [],
              outputFormat: 'detailed',
              structuredTypes: STRUCTURED_DOCUMENT_TYPES,
              unstructuredTypes: UNSTRUCTURED_DOCUMENT_TYPES,
              hybridTypes: HYBRID_DOCUMENT_TYPES,
            };
            break;
            
          default:
            // For Data Feed and File Upload nodes
            if (asset.category === 'Data Feed') {
              nodeType = 'datafeed';
              nodeData = {
                label: asset.name,
                description: asset.description,
                feedType: asset.id,
                config: {},
              };
            } else if (asset.category === 'File Input') {
              nodeType = 'fileupload';
              nodeData = {
                label: asset.name,
                description: asset.description,
                fileType: asset.subtype || 'any',
                config: {
                  allowMultiple: false,
                  processImmediately: true,
                  maxFileSize: 10,
                },
              };
            }
            break;
        }

        const newNode = {
          id: `node-${Date.now()}`,
          type: nodeType,
          position,
          data: nodeData,
        };
        console.log("Creating new node:", newNode);

        dispatch(addNode(newNode as Node));
      } catch (error) {
        console.error('Error adding new node:', error);
        setSnackbar({
          open: true,
          message: 'Failed to add node. Invalid asset data.',
          severity: 'error',
        });
      }
    },
    [project, dispatch]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    console.log("onDragOver event triggered");
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'mod+z': () => dispatch(undo()),
    'mod+y': () => dispatch(redo()),
    'mod+shift+z': () => dispatch(redo()),
    'mod+s': () => handleOpenSaveDialog(),
    'mod+o': () => handleOpenLoadDialog(),
    'mod+g': () => handleOpenGroupDialog(),
    'mod+n': () => handleNewFlow(),
    'delete': () => {
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);
      
      selectedEdges.forEach(edge => dispatch(removeEdge(edge.id)));
      selectedNodes.forEach(node => dispatch(removeNode(node.id)));
    },
  });

  // Group/Ungroup functionality
  const handleOpenGroupDialog = useCallback(() => {
    // Check if there are at least 2 selected nodes
    const selectedNodes = nodes.filter(node => node.selected);
    if (selectedNodes.length < 2) {
      setSnackbar({
        open: true,
        message: 'Select at least 2 nodes to group',
        severity: 'warning',
      });
      return;
    }
    
    setGroupName('Group');
    setIsGroupDialogOpen(true);
  }, [nodes]);

  const handleGroupNodes = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    if (selectedNodes.length < 2) {
      setSnackbar({
        open: true,
        message: 'Select at least 2 nodes to group',
        severity: 'warning',
      });
      return;
    }

    // Calculate the center position of selected nodes
    const positions = selectedNodes.map(node => node.position);
    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    
    // Get node dimensions (use default values if not specified)
    const nodeWidths = selectedNodes.map(node => (node.width || 150));
    const nodeHeights = selectedNodes.map(node => (node.height || 40));
    
    // Calculate max extents
    const maxX = Math.max(...positions.map((p, i) => p.x + nodeWidths[i]));
    const maxY = Math.max(...positions.map((p, i) => p.y + nodeHeights[i]));
    
    // Position the group node at the top-left corner of the selection
    const position = { x: minX - 20, y: minY - 20 };
    
    // Create a group with the selected nodes
    dispatch(groupNodes({
      nodeIds: selectedNodes.map(node => node.id),
      position,
      groupName,
    }));
    
    setIsGroupDialogOpen(false);
    
    setSnackbar({
      open: true,
      message: 'Nodes grouped successfully',
      severity: 'success',
    });
  }, [nodes, groupName, dispatch]);

  const handleUngroupNodes = useCallback(() => {
    // Find selected group nodes
    const selectedGroupNodes = nodes.filter(node => node.selected && node.type === 'group');
    
    if (selectedGroupNodes.length === 0) {
      setSnackbar({
        open: true,
        message: 'Select a group to ungroup',
        severity: 'warning',
      });
      return;
    }
    
    // Ungroup each selected group
    selectedGroupNodes.forEach(node => {
      dispatch(ungroupNodes(node.id));
    });
    
    setSnackbar({
      open: true,
      message: 'Nodes ungrouped successfully',
      severity: 'success',
    });
  }, [nodes, dispatch]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const matchingNodes = nodes.filter(node => 
      node.data.label?.toLowerCase().includes(lowerQuery)
    ).map(node => node.id);
    
    setSearchResults(matchingNodes);
  }, [searchQuery, nodes]);

  const handleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleSearchNodeClick = (nodeId: string) => {
    const node = getNode(nodeId);
    if (node) {
      fitView({ nodes: [node], duration: 800, padding: 0.2 });
    }
  };

  // Flow export functionality 
  const handleExportFlow = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      name: 'Exported Flow',
      description: 'Flow exported from Flow Editor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const jsonString = JSON.stringify(flowData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flow-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: 'Flow exported successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error exporting flow:', error);
      setSnackbar({
        open: true,
        message: 'Failed to export flow. Please try again.',
        severity: 'error',
      });
    }
  }, [nodes, edges]);

  // Save flow functionality
  const handleSaveFlow = useCallback(async () => {
    if (!flowName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const flowData = {
        nodes,
        edges,
        name: flowName,
        description: flowDescription,
      };

      // Check if we're updating an existing flow or creating a new one
      if (currentFlowName === flowName) {
        // Update existing flow
        await flowService.updateFlow(flowName, flowData);
      } else {
        // Create new flow
        await flowService.saveFlow(flowData);
      }
      
      dispatch(markAsSaved());
      
      setSnackbar({
        open: true,
        message: 'Flow saved successfully',
        severity: 'success',
      });
      setIsSaveDialogOpen(false);
      
      // Update current flow name and description in Redux state
      if (currentFlowName !== flowName) {
        dispatch(loadFlow({ ...flowData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
      }
    } catch (error) {
      console.error('Failed to save flow:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save flow. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, flowName, flowDescription, currentFlowName, dispatch]);

  // Snackbar close handler
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // React Flow instance ready handler
  const onInit = useCallback(() => {
    setTimeout(() => {
      fitView({ 
        padding: 0,
        includeHiddenNodes: false,
        minZoom: 0.5,
        maxZoom: 0.9,
        duration: 0
      });
    }, 0);
  }, [fitView]);

  // Filtered nodes for search
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes;
    return nodes.map(node => ({
      ...node,
      highlighted: searchResults.includes(node.id),
    }));
  }, [nodes, searchQuery, searchResults]);

  // Reset error handler for error boundary
  const handleResetError = useCallback(() => {
    dispatch(clearFlow());
    fitView();
  }, [dispatch, fitView]);

  // Load flows dialog
  const handleOpenLoadDialog = useCallback(async () => {
    setIsLoading(true);
    try {
      const flows = await flowService.getFlows();
      setSavedFlows(flows);
      setIsLoadDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch saved flows:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch saved flows. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load selected flow
  const handleLoadFlow = useCallback(async () => {
    if (!selectedFlow) return;
    
    setIsLoading(true);
    try {
      const flowData = await flowService.getFlow(selectedFlow);
      if (!flowData) {
        throw new Error('Flow data not found');
      }
      
      // Find the minimum Y position
      const minY = Math.min(...flowData.nodes.map(node => node.position.y));
      
      // Adjust node positions to be positioned very high in the viewport
      // Using negative Y values to ensure nodes are at the very top
      const adjustedNodes = flowData.nodes.map(node => {
        return {
          ...node,
          position: {
            x: node.position.x,
            y: node.position.y - minY - 200, // Move nodes well above the viewport initially
          }
        };
      });
      
      // Update flowData with adjusted nodes
      const adjustedFlowData = {
        ...flowData,
        nodes: adjustedNodes,
      };
      
      dispatch(loadFlow(adjustedFlowData));
      
      setSnackbar({
        open: true,
        message: 'Flow loaded successfully',
        severity: 'success',
      });
      setIsLoadDialogOpen(false);
      
      // Use fitView with negative padding to ensure nodes are visible at the top
      setTimeout(() => {
        fitView({ 
          padding: -0.1,   // Negative padding pulls nodes toward center
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 0.9,
          duration: 0
        });
      }, 0);
    } catch (error) {
      console.error('Failed to load flow:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load flow. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFlow, dispatch, fitView]);

  // Set flow name and description when opening save dialog
  const handleOpenSaveDialog = useCallback(() => {
    // Use current flow name and description if available
    setFlowName(currentFlowName || '');
    setFlowDescription(currentFlowDescription || '');
    setIsSaveDialogOpen(true);
  }, [currentFlowName, currentFlowDescription]);

  // Add a new function to handle flow deletion
  const handleDeleteFlow = useCallback(async () => {
    if (!flowToDelete) return;
    
    setIsLoading(true);
    try {
      const success = await flowService.deleteFlow(flowToDelete);
      if (!success) {
        throw new Error('Failed to delete flow');
      }
      
      // Refresh the flows list
      const flows = await flowService.getFlows();
      setSavedFlows(flows);
      
      // Clear selected flow if it's the one we just deleted
      if (selectedFlow === flowToDelete) {
        setSelectedFlow('');
      }
      
      setSnackbar({
        open: true,
        message: 'Flow deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to delete flow:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete flow. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
      setIsDeleteConfirmOpen(false);
      setFlowToDelete(null);
    }
  }, [flowToDelete, selectedFlow]);

  // Function to handle delete button click
  const handleDeleteButtonClick = useCallback((e: React.MouseEvent, flowId: string) => {
    e.stopPropagation(); // Prevent flow selection
    setFlowToDelete(flowId);
    setIsDeleteConfirmOpen(true);
  }, []);

  // Add a function to handle new flow creation
  const handleNewFlow = useCallback(() => {
    if (isModified) {
      // If there are unsaved changes, show confirmation dialog
      setIsNewConfirmOpen(true);
    } else {
      // If no unsaved changes, create new flow immediately
      createNewFlow();
    }
  }, [isModified]);

  // Function to create a new empty flow
  const createNewFlow = useCallback(() => {
    dispatch(clearFlow());
    setFlowName('');
    setFlowDescription('');
    setIsNewConfirmOpen(false);
    
    setSnackbar({
      open: true,
      message: 'New flow created',
      severity: 'success',
    });
  }, [dispatch]);

  return (
    <ErrorBoundary 
      FallbackComponent={FlowEditorFallback} 
      onReset={handleResetError}
    >
      <Box
        ref={reactFlowWrapper}
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onInit={onInit}
          nodeTypes={nodeTypes}
          onDrop={onDrop}
          onDragOver={onDragOver}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{
            padding: 0,   // No padding
            includeHiddenNodes: false,
            minZoom: 0.5, // Lower min zoom to see more
            maxZoom: 0.9  // Consistent with loading
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.2}   // Allow more zooming out for large flows
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'default',
            style: { stroke: '#666', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
          selectNodesOnDrag={false}
          panOnDrag={[1, 2]}
          selectionOnDrag={true}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
          panActivationKeyCode="Space"
          proOptions={{ hideAttribution: true }}
          nodesFocusable={true}
          elementsSelectable={true}
          onPaneClick={() => {
            document.body.click();
          }}
          panOnScroll={false}
          zoomOnScroll={false}
          onPaneContextMenu={(e) => e.preventDefault()}
          onNodeContextMenu={(e) => e.preventDefault()}
          onEdgeContextMenu={(e) => e.preventDefault()}
          onNodeClick={(e) => e.stopPropagation()}
          onNodeDoubleClick={(e) => e.stopPropagation()}
          noDragClassName="no-drag"
          nodesDraggable={true}
        >
          <Background />
          <Controls />
          <MiniMap style={{ height: 120 }} zoomable pannable />
          
          {/* Control Panel */}
          <Panel position="top-right">
            <Paper
              elevation={0}
              sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              {/* Undo/Redo */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Undo (Ctrl+Z)">
                  <IconButton
                    size="small"
                    onClick={() => dispatch(undo())}
                  >
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Redo (Ctrl+Y)">
                  <IconButton
                    size="small"
                    onClick={() => dispatch(redo())}
                  >
                    <RedoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Divider />
              
              {/* Zoom controls */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Zoom In">
                  <IconButton
                    size="small"
                    onClick={() => zoomIn()}
                  >
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <IconButton
                    size="small"
                    onClick={() => zoomOut()}
                  >
                    <ZoomOutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Divider />
              
              {/* Group/Ungroup */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Group Nodes (Ctrl+G)">
                  <IconButton
                    size="small"
                    onClick={handleOpenGroupDialog}
                  >
                    <GroupIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Ungroup Nodes">
                  <IconButton
                    size="small"
                    onClick={handleUngroupNodes}
                  >
                    <UngroupIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Divider />
              
              {/* Search */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Search Nodes">
                  <IconButton
                    size="small"
                    onClick={handleSearch}
                    color={isSearchOpen ? 'primary' : 'default'}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Divider />
              
              {/* Save & Export */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="New Flow (Ctrl+N)">
                  <IconButton
                    size="small"
                    onClick={handleNewFlow}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Save Flow (Ctrl+S)">
                  <IconButton
                    size="small"
                    onClick={handleOpenSaveDialog}
                    color={isModified ? 'primary' : 'default'}
                  >
                    <SaveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Open Flow (Ctrl+O)">
                  <IconButton
                    size="small"
                    onClick={handleOpenLoadDialog}
                    sx={{ 
                      bgcolor: 'primary.light', 
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.main',
                      }
                    }}
                  >
                    <OpenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export Flow">
                  <IconButton
                    size="small"
                    onClick={handleExportFlow}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          </Panel>
          
          {/* Search Panel */}
          {isSearchOpen && (
            <Panel position="top-left">
              <Paper
                elevation={0}
                sx={{
                  p: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  width: 250,
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  fullWidth
                />
                {searchResults.length > 0 && (
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {searchResults.map((nodeId) => {
                      const node = nodes.find((n) => n.id === nodeId);
                      return (
                        <Box
                          key={nodeId}
                          onClick={() => handleSearchNodeClick(nodeId)}
                          sx={{
                            py: 0.5,
                            px: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {node?.data?.label || nodeId}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Paper>
            </Panel>
          )}
        </ReactFlow>

        {/* Save Flow Dialog */}
        <Dialog open={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)}>
          <DialogTitle>Save Flow</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                label="Flow Name"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                required
                disabled={isSaving}
              />
              <TextField
                fullWidth
                label="Description"
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                multiline
                rows={3}
                disabled={isSaving}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsSaveDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveFlow}
              variant="contained"
              color="primary"
              disabled={!flowName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Group Nodes Dialog */}
        <Dialog open={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)}>
          <DialogTitle>Group Nodes</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                label="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGroupNodes}
              variant="contained"
              color="primary"
            >
              Group
            </Button>
          </DialogActions>
        </Dialog>

        {/* Load Flow Dialog */}
        <Dialog 
          open={isLoadDialogOpen} 
          onClose={() => setIsLoadDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Open Saved Flow</DialogTitle>
          <DialogContent dividers>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={40} />
              </Box>
            ) : savedFlows.length === 0 ? (
              <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                No saved flows found. Create and save a flow first.
              </Typography>
            ) : (
              <Box sx={{ 
                maxHeight: '400px', 
                overflow: 'auto',
                '& .MuiListItem-root.Mui-selected': {
                  backgroundColor: 'action.selected',
                }
              }}>
                {savedFlows.map((flow) => (
                  <Box
                    key={flow.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      border: '1px solid',
                      borderColor: selectedFlow === flow.id ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      backgroundColor: selectedFlow === flow.id ? 'action.selected' : 'background.paper',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                    onClick={() => setSelectedFlow(flow.id)}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {flow.name}
                      </Typography>
                      {flow.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {flow.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Last updated: {new Date(flow.updatedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleDeleteButtonClick(e, flow.id)}
                      color="error"
                      sx={{ alignSelf: 'flex-start', ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsLoadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLoadFlow}
              variant="contained"
              color="primary"
              disabled={!selectedFlow || isLoading}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading...
                </>
              ) : (
                'Open'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Flow Confirmation Dialog */}
        <Dialog open={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)}>
          <DialogTitle>Delete Flow</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this flow? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteFlow} 
              color="error" 
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Flow Confirmation Dialog */}
        <Dialog open={isNewConfirmOpen} onClose={() => setIsNewConfirmOpen(false)}>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogContent>
            <Typography>
              You have unsaved changes in your current flow. Would you like to save before creating a new flow?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setIsNewConfirmOpen(false);
              createNewFlow();
            }}>
              Don't Save
            </Button>
            <Button onClick={() => {
              setIsNewConfirmOpen(false);
              setIsSaveDialogOpen(true);
            }}>
              Save
            </Button>
            <Button 
              onClick={() => setIsNewConfirmOpen(false)}
              variant="contained"
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
};

export default FlowEditorCanvas; 