const fs = require('fs');
const path = require('path');
const config = require('../config/default');
const queryDispatcher = require('./queryDispatcher');
const userMemoryService = require('./userMemoryService');
const avatarService = require('./avatarService');

// Add retry logic for API calls
const retryWithBackoff = async (fn, retries = 3, backoff = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, backoff));
    return retryWithBackoff(fn, retries - 1, backoff * 2);
  }
};

exports.processChat = async ({ message, sessionId, avatarId, activeAvatars, selectedFiles, onUpdate }) => {
  console.log('Processing chat:', { message, sessionId, avatarId, activeAvatars, selectedFiles });

  try {
    // Get the session data to access chat history
    let session = { messages: [] };
    if (sessionId) {
      try {
        session = await this.getSession(sessionId);
      } catch (error) {
        console.warn('Session not found, starting new session');
      }
    }

    // Get previous responses for this session
    const previousResponses = session.messages || [];
    
    // If a specific avatarId is provided, only get response from that avatar
    if (avatarId) {
      let avatar = activeAvatars.find(a => String(a.id) === String(avatarId));
      if (!avatar) {
        console.warn(`Avatar ${avatarId} not found in activeAvatars. Using first active avatar as fallback.`);
        avatar = activeAvatars[0];
        if (!avatar) {
          throw new Error('No active avatars available for fallback.');
        }
      }
      
      // Use retry logic for API calls
      const response = await retryWithBackoff(async () => {
        const result = await queryDispatcher.dispatch({
          message,
          avatarId,
          chatHistory: previousResponses,
          activeAvatars: [avatar],
          selectedFiles,
          onUpdate
        });
        
        // Ensure response is in correct format
        if (!result || (!result.responses && !result.response)) {
          throw new Error('Invalid response format from API');
        }
        
        return result;
      });

      // Send completion message through SSE
      if (onUpdate) {
        onUpdate({ complete: true });
      }

      return response;
    }

    // Otherwise, get responses from all active avatars with retry logic
    const response = await retryWithBackoff(async () => {
      const result = await queryDispatcher.dispatch({
        message,
        chatHistory: previousResponses,
        activeAvatars,
        selectedFiles,
        onUpdate
      });

      // Validate response format
      if (!result || (!result.responses && !result.response)) {
        throw new Error('Invalid response format from API');
      }

      return result;
    });

    // Send completion message through SSE
    if (onUpdate) {
      onUpdate({ complete: true });
    }

    // If using main avatar, update memory
    if (avatarId === 'main' || response.responses?.some(r => r.avatarId === 'main')) {
      await userMemoryService.updateMemory(message);
    }
    
    return response;
  } catch (error) {
    console.error('Error processing chat:', error);
    // Return a more informative error
    throw new Error(`Chat processing failed: ${error.message}`);
  }
};

exports.saveSession = async (sessionData) => {
  const sessionFile = path.join(config.sessionsDir, `${sessionData.id}.json`);
  fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
  return { success: true, path: sessionFile };
};

exports.getSession = async (sessionId) => {
  const sessionFile = path.join(config.sessionsDir, `${sessionId}.json`);
  if (fs.existsSync(sessionFile)) {
    const data = fs.readFileSync(sessionFile);
    return JSON.parse(data);
  }
  throw new Error('Session not found');
}; 