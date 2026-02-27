// Purpose: WhatsApp security controls (token, rate limit, payload/media policy).
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const { toE164 } = require('../services/whatsapp/phoneUtils');

const rateState = new Map();

function requireWebhookToken(req, res, next) {
  const expected = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (!expected) return next();

  const received = req.headers['x-whatsapp-token'] || req.query?.token || req.body?.token;
  if (received !== expected) {
    return res.status(401).json({ success: false, error: 'Invalid webhook token' });
  }
  return next();
}

function rateLimitInbound(req, res, next) {
  const maxPerMinute = Number(process.env.WHATSAPP_RATE_LIMIT_PER_MINUTE || 30);
  const now = Date.now();
  const sender = toE164(req.whatsappSender || req.body?.from || req.body?.phone || 'unknown') || 'unknown';
  const entry = rateState.get(sender) || { count: 0, windowStart: now };

  if (now - entry.windowStart > 60_000) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;
  rateState.set(sender, entry);
  if (entry.count > maxPerMinute) {
    return res.status(429).json({ success: false, error: 'Too many messages from sender' });
  }
  return next();
}

function enforcePayloadLimits(req, res, next) {
  const text = req.body?.text || req.body?.message || req.body?.content || '';
  const maxChars = Number(process.env.WHATSAPP_MAX_TEXT_CHARS || 4000);
  if (String(text).length > maxChars) {
    return res.status(413).json({ success: false, error: `Message exceeds ${maxChars} characters` });
  }

  const allowMedia = process.env.WHATSAPP_ALLOW_MEDIA === 'true';
  const hasMedia = Boolean(req.body?.media || req.body?.attachments || req.body?.image || req.body?.video || req.body?.audio);
  if (hasMedia && !allowMedia) {
    return res.status(415).json({ success: false, error: 'Media messages are disabled' });
  }

  return next();
}

module.exports = {
  requireWebhookToken,
  rateLimitInbound,
  enforcePayloadLimits
};

