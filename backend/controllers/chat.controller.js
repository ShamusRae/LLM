const chatService = require('../services/chatService');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/default');

// Ensure session directory exists
const ensureSessionDirectory = async () => {
  const rootDir = path.join(__dirname, '../../storage');
  const sessionDir = path.join(rootDir, 'sessions');
  
  try {
    // First ensure root storage directory exists
    try {
      await fs.access(rootDir);
    } catch {
      console.log('Creating root storage directory:', rootDir);
      await fs.mkdir(rootDir, { recursive: true });
    }
    
    // Then ensure sessions subdirectory exists
    try {
      await fs.access(sessionDir);
    } catch {
      console.log('Creating sessions directory:', sessionDir);
      await fs.mkdir(sessionDir, { recursive: true });
    }
    
    return sessionDir;
  } catch (err) {
    console.error('Failed to create session directory:', err);
    throw new Error('Failed to initialize session storage');
  }
};

// Add this near the top of the file with other imports
const streamResponses = new Map();

exports.streamChat = async (req, res) => {
  const { sessionId } = req.params;
  
  // Set headers for SSE, including disabling buffering
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

  // Create a function to send updates and flush the stream
  const sendUpdate = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE update:', error);
    }
  };

  // Store the sendUpdate function for this session
  streamResponses.set(sessionId, sendUpdate);

  // Send initial connection established message
  sendUpdate({ type: 'connected', timestamp: Date.now() });

  // Remove the sendUpdate function and stop ping when client disconnects
  req.on('close', () => {
    streamResponses.delete(sessionId);
  });
};

exports.sendChat = async (req, res) => {
  try {
    const { message, sessionId, avatarId, activeAvatars, selectedFiles } = req.body;
    
    // Get the sendUpdate function for this session
    const sendUpdate = streamResponses.get(sessionId);
    if (!sendUpdate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No SSE connection established for this session'
      });
    }

    // Set response timeout
    res.setTimeout(180000, () => {
      if (sendUpdate) {
        sendUpdate({
          error: true,
          message: 'The chat request took too long to process'
        });
      }
      res.status(504).json({ 
        error: 'Request timeout',
        message: 'The chat request took too long to process'
      });
    });
    
    // Route query to the appropriate avatar via the dispatcher
    const response = await chatService.processChat({ 
      message, 
      sessionId, 
      avatarId, 
      activeAvatars,
      selectedFiles,
      onUpdate: sendUpdate
    });

    // Send final response
    res.json(response);
  } catch (error) {
    console.error('Error in sendChat:', error);
    
    // Try to send error through SSE if available
    const sendUpdate = streamResponses.get(sessionId);
    if (sendUpdate) {
      sendUpdate({
        error: true,
        message: error.message
      });
    }
    
    // Send error response
    if (error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: 'Gateway Timeout',
        message: 'The request took too long to process'
      });
    }
    
    if (error.message.includes('Invalid response format')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'The response format was invalid'
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

exports.saveSession = async (req, res) => {
  try {
    const { id, messages } = req.body;
    
    // Validate required fields
    if (!id || !messages) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Session ID and messages are required'
      });
    }
    
    // Validate messages format
    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Messages must be an array'
      });
    }

    const sessionDir = await ensureSessionDirectory();
    const sessionFile = path.join(sessionDir, `${id}.json`);
    
    // Add metadata to session
    const sessionData = {
      id,
      messages,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
    console.log('Session saved successfully:', id);
    
    res.json({ 
      success: true, 
      sessionId: id,
      updatedAt: sessionData.updatedAt
    });
  } catch (err) {
    console.error('Error saving session:', err);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to save session',
      details: err.message
    });
  }
};

exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Session ID is required'
      });
    }

    const sessionDir = await ensureSessionDirectory();
    const sessionFile = path.join(sessionDir, `${id}.json`);
    
    try {
      const data = await fs.readFile(sessionFile, 'utf8');
      const session = JSON.parse(data);
      
      // Validate session data
      if (!session.id || !session.messages) {
        throw new Error('Invalid session data format');
      }
      
      res.json(session);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Session not found'
        });
      }
      if (err.message === 'Invalid session data format') {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Session data is corrupted'
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('Error reading session:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to read session',
      details: err.message
    });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const sessionDir = await ensureSessionDirectory();
    const files = await fs.readdir(sessionDir);
    const sessions = [];
    for (const file of files) {
      const filePath = path.join(sessionDir, file);
      const data = await fs.readFile(filePath, 'utf8');
      sessions.push(JSON.parse(data));
    }
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
}; 