/**
 * Asset Execution Service
 * 
 * This service standardizes how assets are executed in the flow editor.
 * All assets accept either Markdown or JSON as input and return either Markdown or JSON.
 * 
 * Execution strategies:
 * 1. Direct UI Component - Use existing UI components (e.g., file upload)
 * 2. Direct LLM - Simple tasks that can be handled by an LLM directly
 * 3. Complex LLM - More complex tasks that need an LLM with function access
 * 4. Custom Function - Tasks that need custom code implementation
 * 5. Agent System - Tasks that require multiple steps and agent orchestration
 */

import { Node, Edge } from 'reactflow';
import { LLMService } from '../services/llmService';
import { AssetExecutor, AssetExecutionContext, AssetInput, AssetOutput } from './models/AssetTypes';

// Import asset executors
import FileUploadExecutor from './executors/FileUpload/FileUploadExecutor';
import DocumentClassificationExecutor from './executors/DocumentClassification/DocumentClassificationExecutor';
import DataTransformationExecutor from './executors/DataTransformation/DataTransformationExecutor';

// Asset Execution Service
class AssetExecutionService {
  private llmService: LLMService;
  private executors: Map<string, AssetExecutor>;
  
  constructor(llmService: LLMService) {
    this.llmService = llmService;
    this.executors = new Map();
    
    // Register executors for different asset types
    this.registerExecutors();
  }
  
  private registerExecutors() {
    this.executors.set('fileupload', new FileUploadExecutor());
    this.executors.set('documentclassification', new DocumentClassificationExecutor(this.llmService));
    this.executors.set('datatransformation', new DataTransformationExecutor(this.llmService));
    // Register other asset executors here
  }
  
  // Execute a single asset node
  async executeAsset(node: Node, inputs: AssetInput[] = []): Promise<AssetOutput> {
    const nodeType = node.type as string;
    const executor = this.executors.get(nodeType);
    
    if (!executor) {
      return {
        type: 'markdown',
        content: `Error: No executor found for asset type "${nodeType}"`,
        error: `Unsupported asset type: ${nodeType}`,
        metadata: {
          nodeId: node.id,
          nodeType,
          timestamp: new Date().toISOString(),
          error: true
        }
      };
    }
    
    const context: AssetExecutionContext = {
      nodeId: node.id,
      nodeType,
      nodeData: node.data,
      inputs
    };
    
    try {
      return await executor.execute(context);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        type: 'markdown',
        content: `Error executing asset "${node.data.label || nodeType}": ${errorMessage}`,
        error: errorMessage,
        metadata: {
          nodeId: node.id,
          nodeType,
          timestamp: new Date().toISOString(),
          error: true
        }
      };
    }
  }
  
  // Execute a flow (multiple connected assets)
  async executeFlow(nodes: Node[], edges: Edge[], startNodeId: string): Promise<Record<string, AssetOutput>> {
    // Build adjacency list for the flow graph
    const graph = this.buildFlowGraph(nodes, edges);
    
    // Track visited nodes and their outputs
    const results: Record<string, AssetOutput> = {};
    
    // Execute nodes in topological order starting from startNodeId
    await this.executeNodeAndDependents(startNodeId, graph, nodes, results);
    
    return results;
  }
  
  // Recursively execute a node and all its dependents
  private async executeNodeAndDependents(
    nodeId: string,
    graph: Record<string, string[]>,
    nodes: Node[],
    results: Record<string, AssetOutput>
  ) {
    // If node already executed, skip
    if (results[nodeId]) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Find input nodes and get their outputs
    const inputNodeIds = Object.entries(graph)
      .filter(([_, outputs]) => outputs.includes(nodeId))
      .map(([id]) => id);
    
    // Execute input nodes first if they haven't been executed yet
    for (const inputId of inputNodeIds) {
      if (!results[inputId]) {
        await this.executeNodeAndDependents(inputId, graph, nodes, results);
      }
    }
    
    // Collect inputs from connected nodes
    const inputs = inputNodeIds.map(id => results[id]).filter(Boolean);
    
    // Check if node requires interaction
    const nodeType = node.type as string;
    if (nodeType === 'fileupload') {
      // For nodes requiring UI interaction, return a placeholder
      // The actual execution will happen through the UI
      results[nodeId] = {
        type: 'json',
        content: { requiresInteraction: true, message: 'This asset requires user interaction' },
        metadata: {
          nodeId,
          nodeType,
          interactionRequired: true,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      // Execute current node automatically
      results[nodeId] = await this.executeAsset(node, inputs);
    }
    
    // Execute dependent nodes
    const dependentNodeIds = graph[nodeId] || [];
    for (const dependentId of dependentNodeIds) {
      await this.executeNodeAndDependents(dependentId, graph, nodes, results);
    }
  }
  
  // Build directed graph from nodes and edges
  private buildFlowGraph(nodes: Node[], edges: Edge[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    // Initialize graph with all nodes
    nodes.forEach(node => {
      graph[node.id] = [];
    });
    
    // Add edges
    edges.forEach(edge => {
      if (graph[edge.source]) {
        graph[edge.source].push(edge.target);
      }
    });
    
    return graph;
  }
}

export default AssetExecutionService; 