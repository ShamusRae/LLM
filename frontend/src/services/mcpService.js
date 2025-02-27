/**
 * Service for connecting to the MCP server and managing tool usage
 */
class MCPService {
  constructor() {
    this.eventSource = null;
    this.sessionId = null;
    this.callbacks = {
      onToolStart: null,
      onToolComplete: null,
      onToolError: null,
      onMessage: null
    };
    this.availableTools = [];
  }

  /**
   * Connect to the MCP server using Server-Sent Events
   * @param {string} sessionId - The current chat session ID
   * @param {Object} callbacks - Callback functions for MCP events
   */
  connect(sessionId, callbacks = {}) {
    if (this.eventSource) {
      this.disconnect();
    }

    this.sessionId = sessionId;
    this.callbacks = { ...this.callbacks, ...callbacks };

    const url = `/api/mcp/stream/${sessionId}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('MCP event received:', data);
        
        if (this.callbacks.onMessage) {
          this.callbacks.onMessage(data);
        }

        // Handle specific event types
        if (data.type === 'toolStart' && this.callbacks.onToolStart) {
          this.callbacks.onToolStart(data.toolName);
        } else if (data.type === 'toolComplete' && this.callbacks.onToolComplete) {
          this.callbacks.onToolComplete(data.toolName, data.result);
        } else if (data.type === 'toolError' && this.callbacks.onToolError) {
          this.callbacks.onToolError(data.toolName, data.error);
        }
      } catch (error) {
        console.error('Error parsing MCP event:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('MCP SSE connection error:', error);
      this.reconnect();
    };

    // Load available tools for this session
    this.loadAvailableTools();

    return this;
  }

  /**
   * Load available (enabled) MCP tools from the backend
   */
  async loadAvailableTools() {
    try {
      const response = await fetch('/api/mcp/tools');
      this.availableTools = await response.json();
      console.log('Available MCP tools loaded:', this.availableTools);
    } catch (error) {
      console.error('Failed to load available MCP tools:', error);
      this.availableTools = [];
    }
  }

  /**
   * Get available tools based on user settings
   * @returns {Array} List of available tools
   */
  getAvailableTools() {
    return this.availableTools;
  }

  /**
   * Disconnect from the MCP server
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    return this;
  }

  /**
   * Attempt to reconnect to the MCP server
   */
  reconnect() {
    if (this.sessionId) {
      setTimeout(() => {
        console.log('Attempting to reconnect to MCP server...');
        this.connect(this.sessionId, this.callbacks);
      }, 3000);
    }
  }

  /**
   * Check if the MCP service is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const response = await fetch('/api/mcp/status');
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('MCP status check failed:', error);
      return false;
    }
  }

  /**
   * Execute a specific MCP tool with parameters
   * @param {string} toolId - The tool identifier
   * @param {Object} params - Parameters for the tool
   * @returns {Promise<Object>} - The tool execution result
   */
  async executeTool(toolId, params) {
    if (!this.sessionId) {
      throw new Error('No active session to execute tool');
    }

    try {
      const response = await fetch(`/api/mcp/execute/${toolId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          params
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Tool execution failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error executing tool ${toolId}:`, error);
      throw error;
    }
  }
}

export default new MCPService(); 