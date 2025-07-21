const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const settingsController = require('../controllers/settings.controller');
const aiService = require('../services/ai/aiService');

// Define storage paths
const avatarsDir = path.join(__dirname, '../../storage/avatars');

// Ensure storage directory exists before configuring multer
const ensureStorageExists = async () => {
  try {
    await fs.access(avatarsDir);
  } catch {
    await fs.mkdir(avatarsDir, { recursive: true });
  }
};

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    await ensureStorageExists().catch(console.error);
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'user-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Initialize settings and storage when the router is created
(async () => {
  await ensureStorageExists();
  await settingsController.initializeSettings();
})().catch(console.error);

// Get and update settings
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

// Avatar management
router.post('/avatar', settingsController.saveAvatar);
router.delete('/avatar/:id', settingsController.deleteAvatar);

// User image management
router.post('/user-image', settingsController.saveUserImage);
router.post('/upload-image', upload.single('file'), settingsController.handleFileUpload);

// Get current API key status (without exposing actual keys)
router.get('/api-keys', async (req, res) => {
  try {
    const availability = await aiService.getAvailableProviders();
    const keyStatus = {
      openai: {
        configured: availability.openai,
        status: availability.openai ? 'configured' : 'not_configured'
      },
      claude: {
        configured: availability.claude, 
        status: availability.claude ? 'configured' : 'not_configured'
      },
      ollama: {
        configured: availability.ollama,
        status: availability.ollama ? 'available' : 'offline'
      }
    };
    
    res.json(keyStatus);
  } catch (error) {
    console.error('Error getting API key status:', error);
    res.status(500).json({ 
      error: 'Failed to check API key status',
      message: error.message 
    });
  }
});

// Update API keys (in memory for this session)
router.post('/api-keys', (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      return res.status(400).json({
        error: 'Provider and apiKey are required'
      });
    }

    // Validate the provider
    const validProviders = ['openai', 'claude', 'anthropic'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid provider. Must be one of: ' + validProviders.join(', ')
      });
    }

    // Update environment variable for this session
    const envKey = provider.toUpperCase() + '_API_KEY';
    process.env[envKey] = apiKey;
    
    // For Claude, also set ANTHROPIC_API_KEY
    if (provider.toLowerCase() === 'claude') {
      process.env.ANTHROPIC_API_KEY = apiKey;
    }

    res.json({ 
      success: true, 
      message: `${provider} API key updated successfully`,
      provider: provider.toLowerCase()
    });
    
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ 
      error: 'Failed to update API key',
      message: error.message 
    });
  }
});

// Get service health and availability
router.get('/health', async (req, res) => {
  try {
    const availability = await aiService.getAvailableProviders();
    const models = await aiService.discoverModels();
    
    const health = {
      timestamp: new Date().toISOString(),
      services: {
        openai: {
          available: availability.openai,
          models: models.openai.length,
          status: availability.openai ? 'healthy' : 'api_key_required'
        },
        claude: {
          available: availability.claude,
          models: models.claude.length,
          status: availability.claude ? 'healthy' : 'api_key_required'
        },
        ollama: {
          available: availability.ollama,
          models: models.ollama.length,
          status: availability.ollama ? 'healthy' : 'offline'
        }
      },
      recommendations: []
    };

    // Add recommendations based on service status
    if (!availability.openai && !availability.claude && !availability.ollama) {
      health.recommendations.push('No AI services are available. Please configure API keys or start Ollama.');
    } else if (!availability.ollama) {
      health.recommendations.push('Consider starting Ollama for offline AI capabilities.');
    }
    
    if (!availability.openai) {
      health.recommendations.push('Configure OpenAI API key for access to GPT models.');
    }
    
    if (!availability.claude) {
      health.recommendations.push('Configure Claude API key for access to Anthropic models.');
    }

    res.json(health);
    
  } catch (error) {
    console.error('Error checking service health:', error);
    res.status(500).json({ 
      error: 'Failed to check service health',
      message: error.message 
    });
  }
});

module.exports = router; 