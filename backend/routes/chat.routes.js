const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// Stream endpoints
router.get('/stream/:sessionId', chatController.streamChat);
router.post('/send', chatController.sendChat);

// Session management endpoints
router.post('/session', chatController.saveSession);
router.get('/session/:id', chatController.getSession);
router.get('/sessions', chatController.getSessions);
router.delete('/session/:id', chatController.deleteSession);

module.exports = router; 