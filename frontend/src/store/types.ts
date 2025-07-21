import { Node, Edge } from 'reactflow';

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  history: {
    past: Array<{ nodes: Node[]; edges: Edge[] }>;
    future: Array<{ nodes: Node[]; edges: Edge[] }>;
  };
}

export interface FlowAction {
  type: string;
  payload?: any;
}

export interface RootState {
  flow: FlowState;
} 