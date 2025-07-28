'use strict';

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

/**
 * ConsultingWebSocketService - Real-time communication for consulting projects
 * Eliminates inefficient polling with proper streaming updates
 */
class ConsultingWebSocketService {
  constructor(server, database) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/consulting',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.database = database;
    this.connections = new Map(); // projectId -> Set of WebSocket connections
    this.clientConnections = new Map(); // clientId -> Set of WebSocket connections
    
    this.setupWebSocketServer();
    console.log('🔌 WebSocket server initialized on /ws/consulting');
  }

  /**
   * Verify client connection (authentication, rate limiting, etc.)
   */
  verifyClient(info) {
    // In production, implement proper authentication here
    // For now, allow all connections for development
    return true;
  }

  /**
   * Setup WebSocket server with connection handling
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      console.log('🔌 New WebSocket connection established');
      
      // Set up ping/pong for connection health
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.removeConnection(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeConnection(ws);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'connection_established',
        timestamp: new Date().toISOString(),
        message: 'Connected to consulting updates'
      });
    });

    // Health check ping interval
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log('🔌 Terminating unresponsive WebSocket connection');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Handle incoming client messages
   */
  handleClientMessage(ws, message) {
    switch (message.type) {
      case 'subscribe_project':
        this.subscribeToProject(ws, message.projectId, message.clientId);
        break;
        
      case 'unsubscribe_project':
        this.unsubscribeFromProject(ws, message.projectId);
        break;
        
      case 'subscribe_client':
        this.subscribeToClient(ws, message.clientId);
        break;
        
      case 'get_project_status':
        this.sendProjectStatus(ws, message.projectId);
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message.type);
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Subscribe to project updates
   */
  subscribeToProject(ws, projectId, clientId = null) {
    if (!projectId) {
      return this.sendError(ws, 'Project ID is required');
    }

    // Add to project connections
    if (!this.connections.has(projectId)) {
      this.connections.set(projectId, new Set());
    }
    this.connections.get(projectId).add(ws);

    // Store metadata on the websocket
    ws.subscribedProjects = ws.subscribedProjects || new Set();
    ws.subscribedProjects.add(projectId);
    ws.clientId = clientId;

    console.log(`🔌 Client subscribed to project ${projectId}`);
    
    this.sendMessage(ws, {
      type: 'subscription_confirmed',
      projectId,
      timestamp: new Date().toISOString()
    });

    // Send current project status
    this.sendProjectStatus(ws, projectId);
  }

  /**
   * Unsubscribe from project updates
   */
  unsubscribeFromProject(ws, projectId) {
    if (this.connections.has(projectId)) {
      this.connections.get(projectId).delete(ws);
      
      // Clean up empty sets
      if (this.connections.get(projectId).size === 0) {
        this.connections.delete(projectId);
      }
    }

    if (ws.subscribedProjects) {
      ws.subscribedProjects.delete(projectId);
    }

    this.sendMessage(ws, {
      type: 'unsubscription_confirmed',
      projectId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribe to all projects for a client
   */
  subscribeToClient(ws, clientId) {
    if (!clientId) {
      return this.sendError(ws, 'Client ID is required');
    }

    if (!this.clientConnections.has(clientId)) {
      this.clientConnections.set(clientId, new Set());
    }
    this.clientConnections.get(clientId).add(ws);

    ws.subscribedClientId = clientId;

    this.sendMessage(ws, {
      type: 'client_subscription_confirmed',
      clientId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send current project status
   */
  async sendProjectStatus(ws, projectId) {
    try {
      const project = await this.database.getProject(projectId);
      const progressUpdates = await this.database.getProgressUpdates(projectId, 10);

      this.sendMessage(ws, {
        type: 'project_status',
        projectId,
        project,
        recentUpdates: progressUpdates,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching project status:', error);
      this.sendError(ws, `Failed to fetch project status: ${error.message}`);
    }
  }

  /**
   * Broadcast progress update to project subscribers
   */
  async broadcastProgressUpdate(projectId, progressData) {
    // Save to database first
    await this.database.addProgressUpdate(projectId, progressData);

    // Broadcast to subscribers
    const connections = this.connections.get(projectId);
    if (connections && connections.size > 0) {
      const message = {
        type: 'progress_update',
        projectId,
        progress: progressData,
        timestamp: new Date().toISOString()
      };

      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendMessage(ws, message);
        }
      });

      console.log(`📡 Broadcasted progress update for project ${projectId} to ${connections.size} clients`);
    }
  }

  /**
   * Broadcast project status change
   */
  async broadcastProjectStatusChange(projectId, status, additionalData = {}) {
    try {
      // Update database
      await this.database.updateProject(projectId, { status });

      // Get updated project data
      const project = await this.database.getProject(projectId);

      // Broadcast to project subscribers
      const connections = this.connections.get(projectId);
      if (connections && connections.size > 0) {
        const message = {
          type: 'project_status_change',
          projectId,
          status,
          project,
          ...additionalData,
          timestamp: new Date().toISOString()
        };

        connections.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            this.sendMessage(ws, message);
          }
        });
      }

      // Also broadcast to client subscribers if client_id is available
      if (project.client_id) {
        const clientConnections = this.clientConnections.get(project.client_id);
        if (clientConnections && clientConnections.size > 0) {
          const message = {
            type: 'client_project_update',
            projectId,
            status,
            project,
            ...additionalData,
            timestamp: new Date().toISOString()
          };

          clientConnections.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
              this.sendMessage(ws, message);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error broadcasting project status change:', error);
    }
  }

  /**
   * Broadcast project completion with final report
   */
  async broadcastProjectCompletion(projectId, finalReport) {
    try {
      // Save final report to database
      await this.database.saveProjectReport(projectId, finalReport);
      
      // Update project status
      await this.database.updateProject(projectId, { 
        status: 'completed',
        actual_completion: new Date(),
        quality_score: finalReport.qualityScore
      });

      // Broadcast completion
      await this.broadcastProjectStatusChange(projectId, 'completed', {
        finalReport,
        completedAt: new Date().toISOString()
      });

      console.log(`🎉 Project ${projectId} completion broadcasted`);
    } catch (error) {
      console.error('Error broadcasting project completion:', error);
    }
  }

  /**
   * Send message to WebSocket client
   */
  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  /**
   * Send error message to WebSocket client
   */
  sendError(ws, errorMessage) {
    this.sendMessage(ws, {
      type: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Remove connection from all subscriptions
   */
  removeConnection(ws) {
    // Remove from project subscriptions
    if (ws.subscribedProjects) {
      ws.subscribedProjects.forEach((projectId) => {
        if (this.connections.has(projectId)) {
          this.connections.get(projectId).delete(ws);
          
          // Clean up empty sets
          if (this.connections.get(projectId).size === 0) {
            this.connections.delete(projectId);
          }
        }
      });
    }

    // Remove from client subscriptions
    if (ws.subscribedClientId) {
      const clientConnections = this.clientConnections.get(ws.subscribedClientId);
      if (clientConnections) {
        clientConnections.delete(ws);
        
        if (clientConnections.size === 0) {
          this.clientConnections.delete(ws.subscribedClientId);
        }
      }
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const totalConnections = this.wss.clients.size;
    const projectSubscriptions = Array.from(this.connections.entries()).map(([projectId, connections]) => ({
      projectId,
      subscribers: connections.size
    }));
    const clientSubscriptions = Array.from(this.clientConnections.entries()).map(([clientId, connections]) => ({
      clientId,
      subscribers: connections.size
    }));

    return {
      totalConnections,
      projectSubscriptions,
      clientSubscriptions,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown WebSocket server
   */
  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.wss.clients.forEach((ws) => {
      ws.terminate();
    });
    
    this.wss.close();
    console.log('🔌 WebSocket server closed');
  }
}

module.exports = ConsultingWebSocketService; 