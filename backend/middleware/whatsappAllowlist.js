// Purpose: Restrict WhatsApp access to configured owner numbers.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const { parseAllowlist, toE164 } = require('../services/whatsapp/phoneUtils');

function resolveInboundPhone(req) {
  const direct = req.body?.from || req.body?.phone || req.body?.sender;
  if (direct) return toE164(direct);

  const firstMessage = Array.isArray(req.body?.messages) ? req.body.messages[0] : null;
  if (firstMessage?.from) return toE164(firstMessage.from);
  return null;
}

function whatsappAllowlistMiddleware(req, res, next) {
  const allowlist = parseAllowlist(process.env.WHATSAPP_ALLOWED_NUMBERS || '');
  if (allowlist.length === 0) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp allowlist is not configured'
    });
  }

  const inboundPhone = resolveInboundPhone(req);
  if (!inboundPhone) {
    return res.status(400).json({
      success: false,
      error: 'Could not resolve sender phone number'
    });
  }

  if (!allowlist.includes(inboundPhone)) {
    console.warn(`Blocked WhatsApp sender not on allowlist: ${inboundPhone}`);
    return res.status(403).json({
      success: false,
      error: 'Sender is not allowed'
    });
  }

  req.whatsappSender = inboundPhone;
  return next();
}

module.exports = whatsappAllowlistMiddleware;

