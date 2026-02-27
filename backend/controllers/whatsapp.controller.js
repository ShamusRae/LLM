// Purpose: Handle inbound WhatsApp events and relay to chat pipeline.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const fs = require('fs').promises;
const path = require('path');
const chatService = require('../services/chatService');
const whatsappService = require('../services/whatsappService');

const settingsPath = path.join(__dirname, '../../storage/settings.json');

async function loadDefaultActiveAvatar() {
  try {
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    const avatars = Array.isArray(settings.avatars) ? settings.avatars : [];
    if (avatars.length > 0) return [avatars[0]];
  } catch (error) {
    console.warn(`Failed to load settings for WhatsApp default avatar: ${error.message}`);
  }
  return [{
    id: 'whatsapp-default',
    name: 'Rovesg Assistant',
    role: 'Family Office Assistant',
    modelCategory: 'General'
  }];
}

exports.health = async (req, res) => {
  res.json({
    success: true,
    status: whatsappService.getStatus()
  });
};

exports.inbound = async (req, res) => {
  try {
    const parsed = whatsappService.normalizeInboundMessage(req.body);
    if (!parsed.from || !parsed.text) {
      return res.status(400).json({
        success: false,
        error: 'Inbound payload missing sender or text'
      });
    }

    const activeAvatars = await loadDefaultActiveAvatar();
    const selectedDataFeeds = Array.isArray(req.body?.selectedDataFeeds) ? req.body.selectedDataFeeds : [];
    const sessionId = `whatsapp-${parsed.from.replace('+', '')}`;

    const result = await chatService.processChat({
      message: parsed.text,
      sessionId,
      activeAvatars,
      selectedFiles: [],
      selectedDataFeeds,
      conversationContext: [],
      onUpdate: null
    });

    const responses = Array.isArray(result?.responses) ? result.responses : [];
    const responseText = responses.map((r) => r.response).filter(Boolean).join('\n\n').trim();
    if (!responseText) {
      return res.status(502).json({
        success: false,
        error: 'No assistant response generated'
      });
    }

    const delivery = await whatsappService.sendMessage(parsed.from, responseText);
    return res.json({
      success: true,
      sessionId,
      sender: parsed.from,
      delivered: delivery.delivered,
      mode: delivery.mode
    });
  } catch (error) {
    console.error('WhatsApp inbound processing failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process inbound WhatsApp message',
      message: error.message
    });
  }
};

