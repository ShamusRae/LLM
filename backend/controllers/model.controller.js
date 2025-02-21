const modelService = require('../services/modelService');

exports.discoverModels = async (req, res) => {
  try {
    const models = await modelService.discoverAvailableModels();
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 