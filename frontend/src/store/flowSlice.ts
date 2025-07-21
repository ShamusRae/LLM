import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Edge, Node } from 'reactflow';

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  history: {
    past: Array<{ nodes: Node[]; edges: Edge[] }>;
    future: Array<{ nodes: Node[]; edges: Edge[] }>;
  };
  isModified: boolean;
  nodeCounter: number;
  currentFlowName: string;
  currentFlowDescription: string;
}

export interface LoadFlowPayload {
  id?: string;
  nodes: Node[];
  edges: Edge[];
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupNodesPayload {
  nodeIds: string[];
  position: { x: number; y: number };
  groupName?: string;
}

const initialState: FlowState = {
  nodes: [],
  edges: [],
  history: {
    past: [],
    future: [],
  },
  isModified: false,
  nodeCounter: 0,
  currentFlowName: '',
  currentFlowDescription: '',
};

// Helper function to save current state to history
const saveToHistory = (state: FlowState) => {
  if (state.nodes.length === 0 && state.edges.length === 0) return;
  
  state.history.past.push({
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
  });
  state.history.future = [];
  state.isModified = true;
};

const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<Node[]>) => {
      if (JSON.stringify(state.nodes) !== JSON.stringify(action.payload)) {
        saveToHistory(state);
        state.nodes = action.payload;
      }
    },
    setEdges: (state, action: PayloadAction<Edge[]>) => {
      if (JSON.stringify(state.edges) !== JSON.stringify(action.payload)) {
        saveToHistory(state);
        state.edges = action.payload;
      }
    },
    addNode: (state, action: PayloadAction<Node>) => {
      saveToHistory(state);
      state.nodes.push(action.payload);
      state.nodeCounter += 1;
    },
    updateNode: (state, action: PayloadAction<{ id: string; data: any }>) => {
      const { id, data } = action.payload;
      const nodeIndex = state.nodes.findIndex(node => node.id === id);
      
      if (nodeIndex !== -1) {
        saveToHistory(state);
        state.nodes[nodeIndex] = {
          ...state.nodes[nodeIndex],
          data: {
            ...state.nodes[nodeIndex].data,
            ...data
          }
        };
      }
    },
    removeNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      saveToHistory(state);
      
      // Remove node
      state.nodes = state.nodes.filter(node => node.id !== nodeId);
      
      // Remove connected edges
      state.edges = state.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      );
    },
    addEdge: (state, action: PayloadAction<Edge>) => {
      saveToHistory(state);
      state.edges.push(action.payload);
    },
    removeEdge: (state, action: PayloadAction<string>) => {
      const edgeId = action.payload;
      saveToHistory(state);
      state.edges = state.edges.filter(edge => edge.id !== edgeId);
    },
    groupNodes: (state, action: PayloadAction<GroupNodesPayload>) => {
      const { nodeIds, position, groupName = 'Group' } = action.payload;
      
      if (nodeIds.length < 2) return;
      
      saveToHistory(state);
      
      // Create a new group node
      const groupId = `group-${Date.now()}`;
      const groupNode: Node = {
        id: groupId,
        type: 'group',
        position,
        data: {
          label: groupName,
          childNodeIds: nodeIds,
        },
        style: {
          width: 300,
          height: 300,
          backgroundColor: 'rgba(240, 240, 240, 0.7)',
          border: '1px dashed #aaa',
          borderRadius: 5,
          padding: 10,
        },
      };
      
      // Update child nodes to include parent group
      state.nodes = state.nodes.map(node => {
        if (nodeIds.includes(node.id)) {
          return {
            ...node,
            parentNode: groupId,
            extent: 'parent',
            position: {
              x: node.position.x - position.x,
              y: node.position.y - position.y,
            },
          };
        }
        return node;
      });
      
      // Add the group node
      state.nodes.push(groupNode);
    },
    ungroupNodes: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      const groupNode = state.nodes.find(node => node.id === groupId);
      
      if (!groupNode || groupNode.type !== 'group') return;
      
      saveToHistory(state);
      
      // Get the absolute position of the group node
      const groupPosition = groupNode.position;
      
      // Restore child nodes to their absolute positions
      state.nodes = state.nodes.map(node => {
        if (node.parentNode === groupId) {
          return {
            ...node,
            parentNode: undefined,
            extent: undefined,
            position: {
              x: node.position.x + groupPosition.x,
              y: node.position.y + groupPosition.y,
            },
          };
        }
        return node;
      });
      
      // Remove the group node
      state.nodes = state.nodes.filter(node => node.id !== groupId);
    },
    undo: (state) => {
      if (state.history.past.length === 0) return;
      
      const previous = state.history.past[state.history.past.length - 1];
      state.history.future.unshift({
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      });
      
      state.nodes = previous.nodes;
      state.edges = previous.edges;
      state.history.past.pop();
    },
    redo: (state) => {
      if (state.history.future.length === 0) return;
      
      const next = state.history.future[0];
      state.history.past.push({
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      });
      
      state.nodes = next.nodes;
      state.edges = next.edges;
      state.history.future.shift();
    },
    loadFlow: (state, action: PayloadAction<LoadFlowPayload>) => {
      const { nodes, edges, name, description } = action.payload;
      state.nodes = nodes;
      state.edges = edges;
      state.history = initialState.history;
      state.isModified = false;
      state.currentFlowName = name;
      state.currentFlowDescription = description || '';
      
      // Update node counter to be higher than any existing node id
      const maxNumericId = nodes
        .map(node => {
          const idNum = parseInt(node.id.replace(/\D/g, ''));
          return isNaN(idNum) ? 0 : idNum;
        })
        .reduce((max, id) => Math.max(max, id), 0);
      
      state.nodeCounter = maxNumericId + 1;
    },
    clearFlow: (state) => {
      saveToHistory(state);
      state.nodes = [];
      state.edges = [];
      state.currentFlowName = '';
      state.currentFlowDescription = '';
    },
    markAsSaved: (state) => {
      state.isModified = false;
    },
  },
});

export const {
  setNodes,
  setEdges,
  addNode,
  updateNode,
  removeNode,
  addEdge,
  removeEdge,
  groupNodes,
  ungroupNodes,
  undo,
  redo,
  loadFlow,
  clearFlow,
  markAsSaved,
} = flowSlice.actions;

export const flowReducer = flowSlice.reducer; 