// Purpose: WhatsApp channel endpoints (health + inbound webhook).
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const express = require('express');
const controller = require('../controllers/whatsapp.controller');
const allowlistMiddleware = require('../middleware/whatsappAllowlist');
const {
  requireWebhookToken,
  rateLimitInbound,
  enforcePayloadLimits
} = require('../middleware/whatsappSecurity');

const router = express.Router();

router.get('/status', controller.health);
router.post(
  '/inbound',
  requireWebhookToken,
  allowlistMiddleware,
  rateLimitInbound,
  enforcePayloadLimits,
  controller.inbound
);

module.exports = router;

