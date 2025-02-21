const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// Chat endpoints
router.post('/send', chatController.sendChat);
router.get('/stream/:sessionId', chatController.streamChat);

// Session management endpoints
router.post('/session', chatController.saveSession);
router.get('/session/:id', chatController.getSession);

module.exports = router; 