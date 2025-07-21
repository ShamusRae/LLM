const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const aiService = require('../services/ai/aiService');

/**
 * @route POST /api/llm
 * @desc Generate text using an LLM
 * @access Private
 */
router.post('/', [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  body('model').optional(),
  body('temperature').optional().isFloat({ min: 0, max: 2 }),
  body('max_tokens').optional().isInt({ min: 1, max: 8000 }),
  body('stop').optional(),
  body('response_format').optional(),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { prompt, model, temperature, max_tokens, stop, response_format } = req.body;

  try {
    const provider = aiService.getProvider('openai', process.env.OPENAI_API_KEY);
    const completion = await provider.generateResponse(prompt, {
      model: model || 'gpt-4',
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: max_tokens || 1000,
      stop: stop,
      response_format: response_format,
    });

    return res.json({
      text: completion.choices[0].message.content,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('LLM API error:', error);
    return res.status(500).json({
      message: 'Error generating text from LLM',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/llm/functions
 * @desc Generate text with function calling capability
 * @access Private
 */
router.post('/functions', [
  body('system').optional(),
  body('user').notEmpty().withMessage('User prompt is required'),
  body('functions').optional().isArray(),
  body('model').optional(),
  body('temperature').optional().isFloat({ min: 0, max: 2 }),
  body('max_tokens').optional().isInt({ min: 1, max: 8000 }),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { system, user, functions, model, temperature, max_tokens } = req.body;

  // Prepare messages
  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: user });

  try {
    // If functions are provided, include them in the request
    const provider = aiService.getProvider('openai', process.env.OPENAI_API_KEY);
    const completion = await provider.generateResponse(user, {
      model: model || 'gpt-4',
      systemMessage: system,
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: max_tokens || 1000,
      functions: functions || undefined,
      function_call: functions?.length ? 'auto' : undefined,
    });

    const response = completion.choices[0].message;

    // Check if the model decided to call a function
    if (response.function_call) {
      // In a real implementation, we would execute the function here
      // For now, we'll just mock a function result
      return res.json({
        function_call: response.function_call,
        function_result: {
          result: `Executed function ${response.function_call.name} successfully`,
          data: JSON.parse(response.function_call.arguments),
        },
        usage: completion.usage,
      });
    }

    return res.json({
      text: response.content,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('LLM functions API error:', error);
    return res.status(500).json({
      message: 'Error generating text with functions from LLM',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/llm/discover
 * @desc Discover all available models from all configured providers
 * @access Public
 */
router.get('/discover', async (req, res) => {
  try {
    const models = await aiService.discoverModels();
    res.json(models);
  } catch (error) {
    console.error('Error discovering models:', error);
    res.status(500).json({
      message: 'Failed to discover models',
      error: error.message,
    });
  }
});

module.exports = router; 