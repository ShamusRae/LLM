'use strict';

const avatarDecisionService = require('../services/avatarDecisionService');

exports.chooseAvatar = async (req, res) => {
  try {
    const { message, activeAvatars, chatHistory } = req.body;
    if (!activeAvatars || !Array.isArray(activeAvatars) || activeAvatars.length === 0) {
      return res.status(400).json({ error: "No active avatars provided" });
    }

    // Use the new decision service that constructs a prompt with chat history, avatar details, and the user message
    const decision = await avatarDecisionService.decideAvatarOrder(chatHistory || [], activeAvatars, message);
    return res.json(decision);
  } catch (error) {
    console.error("Error in chooseAvatar controller:", error);
    return res.status(500).json({ error: "Internal server error in chooseAvatar" });
  }
}; 