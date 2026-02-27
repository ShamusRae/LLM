const express = require('express');
const router = express.Router();
const { mcpServer } = require('../services/mcpService');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const fs = require('fs').promises;
const path = require('path');
const settingsPath = path.join(__dirname, '../../storage/settings.json');
const { createFileFromExternalSource } = require('../services/fileService');
const mcpService = require('../services/mcpService');
const mcpBridge = require('../services/mcpBridge');

// A map to track active SSE connections by session ID
const sseConnections = new Map();

// SSE endpoint to establish a streaming connection for MCP
router.get('/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  console.log(`MCP SSE connection requested for session: ${sessionId}`);
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });
  
  // Force flush headers immediately
  if (res.flushHeaders) {
    res.flushHeaders();
  }
  
  // Create SSE transport with additional error handling
  try {
    const transport = new SSEServerTransport('/api/mcp/messages', res);
    
    // Store the transport with the session ID
    sseConnections.set(sessionId, transport);
    
    try {
      // Connect the MCP server to this transport
      await mcpServer.connect(transport);
      
      // Send initial connection established message
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
      
      // Set up a heartbeat to keep the connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        } catch (heartbeatError) {
          console.error(`Heartbeat error for session ${sessionId}:`, heartbeatError);
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Send heartbeat every 30 seconds
      
      // Clean up the connection and heartbeat when client disconnects
      req.on('close', () => {
        console.log(`MCP SSE connection closed for session: ${sessionId}`);
        clearInterval(heartbeatInterval);
        sseConnections.delete(sessionId);
      });
      
      // Handle connection errors
      req.on('error', (error) => {
        console.error(`MCP SSE connection error for session ${sessionId}:`, error);
        clearInterval(heartbeatInterval);
        sseConnections.delete(sessionId);
      });
      
    } catch (error) {
      console.error(`Error connecting MCP server for session ${sessionId}:`, error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }
  } catch (transportError) {
    console.error(`Error creating SSE transport for session ${sessionId}:`, transportError);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to establish connection' })}\n\n`);
    res.end();
  }
});

// Endpoint to receive messages from the client to the MCP server
router.post('/messages/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const transport = sseConnections.get(sessionId);
  
  if (!transport) {
    return res.status(400).json({
      error: 'No active MCP connection for this session'
    });
  }
  
  try {
    // Let the transport handle the message
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error(`Error handling MCP message for session ${sessionId}:`, error);
    res.status(500).json({
      error: 'Failed to process MCP message',
      message: error.message
    });
  }
});

// Simple status endpoint to check if MCP service is running
router.get('/status', (req, res) => {
  const tools = mcpBridge.listTools();
  res.json({
    status: 'ok',
    tools,
    toolCount: tools.length,
    bridge: mcpBridge.getBridgeDiagnostics(),
    version: '1.1.0'
  });
});

// MCP bridge diagnostics (provider, node compatibility, selected server, config path)
router.get('/bridge/diagnostics', (req, res) => {
  try {
    res.json({
      status: 'ok',
      bridge: mcpBridge.getBridgeDiagnostics()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Get available MCP tools
router.get('/tools', async (req, res) => {
  try {
    // Read settings to get enabled data feeds
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    const enabledDataFeeds = settings.enabledDataFeeds || ['google-maps-search'];
    
    // Filter tools based on enabled data feeds
    const allTools = mcpBridge.listTools();
    const filteredTools = allTools.filter(tool => enabledDataFeeds.includes(tool.id));
    
    res.json(filteredTools);
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    res.status(500).json({ error: 'Failed to fetch MCP tools' });
  }
});

// Execute a specific tool with parameters
router.post('/execute/:toolId', async (req, res) => {
  const toolId = req.params.toolId;
  const { sessionId, params } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  try {
    // Verify tool is enabled in settings
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    const enabledDataFeeds = settings.enabledDataFeeds || ['google-maps-search'];
    
    if (!enabledDataFeeds.includes(toolId)) {
      return res.status(403).json({ 
        error: `Tool "${toolId}" is not enabled. Enable it in settings first.` 
      });
    }
    
    // Execute tool using the correct method name
    const result = await mcpBridge.callTool(toolId, params);
    res.json(result);
  } catch (error) {
    console.error(`Error executing tool ${toolId}:`, error);
    res.status(500).json({ error: error.message || 'Tool execution failed' });
  }
});

// Download a file from a tool result and save it to user storage
router.post('/download-file', async (req, res) => {
  const { toolId, fileData, source, metadata } = req.body;
  
  if (!toolId || !fileData || !source) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  try {
    // Verify tool is enabled in settings
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    const enabledDataFeeds = settings.enabledDataFeeds || ['google-maps-search'];
    
    if (!enabledDataFeeds.includes(toolId)) {
      return res.status(403).json({ 
        error: `Tool "${toolId}" is not enabled. Enable it in settings first.` 
      });
    }
    
    if (toolId === 'sec-filings') {
      // Use real SEC filing downloads instead of mock content
      if (req.body.params && req.body.params.download_id) {
        try {
          const fileInfo = await mcpService.downloadSECFiling(req.body.params);
          
          return res.type(fileInfo.contentType).send(fileInfo.content);
        } catch (error) {
          console.error('Error downloading SEC filing:', error);
          return res.status(500).json({ error: `Failed to download filing: ${error.message}` });
        }
      } else {
        // Handle search results
        const { company, filingType, limit } = req.body.params || {};
        try {
          const results = await mcpService.secFilingsSearch(company, filingType, limit);
          return res.json(results);
        } catch (error) {
          console.error('Error searching SEC filings:', error);
          return res.status(500).json({ 
            error: `Failed to search SEC filings: ${error.message}`,
            status: "ERROR"
          });
        }
      }
    } else if (toolId === 'companies-house') {
      // Create a simple PDF-like buffer for Companies House
      fileContent = Buffer.from(`%PDF-1.5
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 150 >>
stream
BT
/F1 12 Tf
50 700 Td
(${metadata.company_name || 'UK Company'} - ${metadata.filing_type || 'Filing'}) Tj
0 -20 Td
(Filing Date: ${metadata.filing_date || new Date().toISOString().split('T')[0]}) Tj
0 -20 Td
(${metadata.description || 'Companies House Document'}) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R /Size 5 >>
%%EOF`);
       
       fileName = `${metadata.company_name || 'UK Company'} ${metadata.filing_type || 'Filing'} ${metadata.filing_date || 'Document'}.pdf`;
       fileType = 'PDF';
       
       // Save the file using fileService
       const savedFile = await createFileFromExternalSource({
         content: fileContent,
         fileName,
         sourceType: toolId,
         fileType,
         metadata
       });
       
       return res.json({
         status: 'OK',
         file: savedFile,
         message: `File from ${toolId} saved as ${fileName}`
       });
    } else {
      return res.status(400).json({ error: 'Unsupported tool for file download' });
    }
  } catch (error) {
    console.error(`Error downloading file from ${toolId}:`, error);
    res.status(500).json({ error: error.message || 'File download failed' });
  }
});

module.exports = router; 