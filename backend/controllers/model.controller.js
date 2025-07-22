const modelService = require('../services/modelService');

exports.discoverModels = async (req, res) => {
  try {
    const models = await modelService.discoverAvailableModels();
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/model/categorized
 * Discover and categorize models using AI
 */
exports.discoverCategorizedModels = async (req, res) => {
  try {
    const result = await modelService.discoverAndCategorizeModels();
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Error categorizing models:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      fallback: 'Using basic model discovery instead'
    });
  }
};

/**
 * POST /api/model/resolve-avatar
 * Resolve the best model for an avatar based on its category
 */
exports.resolveAvatarModel = async (req, res) => {
  try {
    const { avatar, preferLocal = false } = req.body;
    
    if (!avatar) {
      return res.status(400).json({
        success: false,
        error: 'Avatar configuration is required'
      });
    }
    
    const resolvedModel = await modelService.resolveAvatarModel(avatar, preferLocal);
    
    res.json({
      success: true,
      avatar: {
        id: avatar.id,
        name: avatar.name,
        category: avatar.modelCategory || avatar.selectedModel || 'General'
      },
      resolvedModel,
      preferLocal,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Error resolving avatar model:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * POST /api/model/check-escalation  
 * Check if a model response suggests escalation
 */
exports.checkEscalation = async (req, res) => {
  try {
    const { currentCategory, responseContent } = req.body;
    
    if (!currentCategory || !responseContent) {
      return res.status(400).json({
        success: false,
        error: 'Current category and response content are required'
      });
    }
    
    const escalationResult = modelService.checkForEscalation(currentCategory, responseContent);
    
    res.json({
      success: true,
      ...escalationResult,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Error checking escalation:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}; 