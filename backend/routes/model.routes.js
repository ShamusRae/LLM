const express = require('express');
const router = express.Router();
const aiService = require('../services/ai/aiService');
const modelController = require('../controllers/model.controller');

// Get available models from all providers (legacy endpoint)
router.get('/discover', async (req, res) => {
  try {
    const models = await aiService.discoverModels();
    const availability = await aiService.getAvailableProviders();
    
    res.json({
      ...models,
      availability: availability,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error discovering models:', error);
    res.status(500).json({
      error: 'Failed to discover available models',
      message: error.message,
      ollama: [],
      openai: [],
      claude: [],
      availability: {
        ollama: false,
        openai: false,
        claude: false
      }
    });
  }
});

// Get categorized models using AI analysis
router.get('/categorized', modelController.discoverCategorizedModels);

// Resolve the best model for an avatar
router.post('/resolve-avatar', modelController.resolveAvatarModel);

// Check if escalation is needed
router.post('/check-escalation', modelController.checkEscalation);

module.exports = router; 