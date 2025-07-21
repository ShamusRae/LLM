'use strict';

const avatarDecisionService = require('../services/avatarDecisionService');
const { mcpServer } = require('../services/mcpService');

exports.chooseAvatar = async (req, res) => {
  try {
    const { message, activeAvatars, chatHistory } = req.body;
    if (!activeAvatars || !Array.isArray(activeAvatars) || activeAvatars.length === 0) {
      return res.status(400).json({ error: "No active avatars provided" });
    }

    // Use the new decision service that constructs a prompt with chat history, avatar details, and the user message
    const decision = await avatarDecisionService.decideAvatarOrder(chatHistory || [], activeAvatars, message);

    // Get available tools from MCP server
    const availableTools = mcpServer.getAvailableTools();
    
    // Collect enabled tools from all active avatars
    let enabledTools = [];
    for (const avatar of activeAvatars) {
      if (avatar.enabledTools && Array.isArray(avatar.enabledTools)) {
        enabledTools = [...enabledTools, ...avatar.enabledTools];
      }
    }
    
    // Remove duplicates
    enabledTools = [...new Set(enabledTools)];
    
    // If no tools are enabled, use all available tools as default
    if (enabledTools.length === 0) {
      enabledTools = availableTools.map(tool => tool.id);
    }
    
    // Return the result to the frontend with tool information
    res.json({
      success: true,
      order: decision.order,
      discussionRounds: decision.discussionRounds,
      enabledTools: enabledTools,
      availableTools: availableTools
    });
  } catch (error) {
    console.error("Error in chooseAvatar controller:", error);
    return res.status(500).json({ error: "Internal server error in chooseAvatar" });
  }
}; 