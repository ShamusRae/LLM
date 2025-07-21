import { Node, Edge } from 'reactflow';

export interface FlowData {
  id?: string;
  nodes: Node[];
  edges: Edge[];
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

class FlowService {
  private readonly STORAGE_KEY = 'flows';

  // Save a flow
  saveFlow(flow: Omit<FlowData, 'createdAt' | 'updatedAt'>): FlowData {
    const flows = this.getAllFlows();
    const now = new Date().toISOString();
    
    const newFlow: FlowData = {
      ...flow,
      createdAt: now,
      updatedAt: now,
    };

    flows.push(newFlow);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(flows));
    
    return newFlow;
  }

  // Update an existing flow
  updateFlow(id: string, flow: Partial<FlowData>): FlowData | null {
    const flows = this.getAllFlows();
    const index = flows.findIndex((f) => f.name === id);

    if (index === -1) return null;

    const updatedFlow: FlowData = {
      ...flows[index],
      ...flow,
      updatedAt: new Date().toISOString(),
    };

    flows[index] = updatedFlow;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(flows));
    
    return updatedFlow;
  }

  // Delete a flow
  deleteFlow(id: string): boolean {
    const flows = this.getAllFlows();
    const filteredFlows = flows.filter((f) => f.name !== id);
    
    if (filteredFlows.length === flows.length) return false;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredFlows));
    return true;
  }

  // Get all flows
  getAllFlows(): FlowData[] {
    const flowsJson = localStorage.getItem(this.STORAGE_KEY);
    const flows = flowsJson ? JSON.parse(flowsJson) : [];
    
    // Add id field (using name as id)
    return flows.map((flow: FlowData) => ({
      ...flow,
      id: flow.name, // Use name as id for backwards compatibility
    }));
  }

  // Get simplified flow list for UI
  getFlows(): Promise<Array<{id: string, name: string, description: string, updatedAt: string}>> {
    return Promise.resolve(this.getAllFlows().map(flow => ({
      id: flow.name, // Use name as id for compatibility
      name: flow.name,
      description: flow.description || '',
      updatedAt: flow.updatedAt,
    })));
  }

  // Get a specific flow by ID
  getFlow(id: string): FlowData | null {
    const flows = this.getAllFlows();
    return flows.find((f) => f.name === id) || null;
  }

  // Export flow as JSON
  exportFlow(flow: FlowData): string {
    return JSON.stringify(flow, null, 2);
  }

  // Import flow from JSON
  importFlow(json: string): FlowData | null {
    try {
      const flow = JSON.parse(json) as FlowData;
      if (!this.validateFlow(flow)) return null;
      return this.saveFlow(flow);
    } catch {
      return null;
    }
  }

  // Validate flow data
  private validateFlow(flow: any): flow is Omit<FlowData, 'createdAt' | 'updatedAt'> {
    return (
      flow &&
      Array.isArray(flow.nodes) &&
      Array.isArray(flow.edges) &&
      typeof flow.name === 'string' &&
      (!flow.description || typeof flow.description === 'string')
    );
  }
}

export const flowService = new FlowService(); 