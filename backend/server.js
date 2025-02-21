'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const app = express();

require('dotenv').config();

/* Added global error handlers to prevent crashes from unhandled errors */
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Initialize storage directories
const storageDirectories = {
  root: path.join(__dirname, '../storage'),
  avatars: path.join(__dirname, '../storage/avatars'),
  uploads: path.join(__dirname, '../storage/uploads'),
  sessions: path.join(__dirname, '../storage/sessions')
};

// Ensure all storage directories exist
async function initializeStorageDirectories() {
  for (const [name, dir] of Object.entries(storageDirectories)) {
    try {
      await fs.access(dir);
      console.log(`${name} directory exists at: ${dir}`);
    } catch {
      console.log(`Creating ${name} directory at: ${dir}`);
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

// Initialize storage before starting the server
initializeStorageDirectories().catch(err => {
  console.error('Failed to initialize storage directories:', err);
  process.exit(1);
});

// Enable CORS for frontend with all necessary headers
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Add CORS headers to all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
    res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', corsOptions.maxAge);
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the avatars directory
app.use('/avatars', express.static(path.join(__dirname, '../storage/avatars'), {
  setHeaders: (res, filePath) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    // Set proper content type based on file extension
    if (filePath.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.webp')) {
      res.set('Content-Type', 'image/webp');
    }
  }
}));

// Add error handling for static files
app.use((err, req, res, next) => {
  if (err) {
    console.error('Error serving static file:', err);
    res.status(err.status || 500).json({
      error: 'Error serving file',
      details: err.message
    });
  } else {
    next();
  }
});

// Serve static directories
const avatarsPath = path.join(__dirname, '../storage/avatars');
const uploadsPath = path.join(__dirname, '../storage/uploads');
console.log('Serving avatars from:', avatarsPath);
console.log('Serving uploads from:', uploadsPath);

// Add timeout middleware
app.use((req, res, next) => {
  // Increase timeout to 10 minutes for complex queries
  res.setTimeout(600000, () => {
    console.error('Request timeout');
    res.status(504).send('Request timeout');
  });
  next();
});

// Import routes
const fileRoutes = require('./routes/file.routes');
const settingsRoutes = require('./routes/settings.routes');
const chatRoutes = require('./routes/chat.routes');

// Register routes
app.use('/api/file', fileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/settings', settingsRoutes);

// Import the chooseAvatar controller
const chooseAvatarController = require('./controllers/chooseAvatar.controller');

// Add the choose-avatar endpoint
app.post('/api/choose-avatar', chooseAvatarController.chooseAvatar);

// Import the chat controller
const chatController = require('./controllers/chat.controller');

// API Routes
app.post('/api/chat/send', async (req, res) => {
  const { message, sessionId, avatarId, avatarInfo } = req.body;
  console.log('Received message:', message);
  console.log('Avatar info:', avatarInfo);

  // Declare modelProvider and modelId upfront so they're available in all scopes
  let modelProvider = 'openai';
  let modelId = 'gpt-4-turbo-preview';

  try {
    if (avatarInfo?.selectedModel) {
      try {
        const [provider, ...modelParts] = avatarInfo.selectedModel.split(':');
        if (provider && modelParts.length > 0) {
          modelProvider = provider;
          modelId = modelParts.join(':');
        } else {
          console.warn('Invalid model format, using default model');
        }
      } catch (error) {
        console.error('Error parsing model info:', error);
        console.warn('Using default model');
      }
    } else {
      console.log('No model selected, using default model');
    }

    console.log('Using model:', { provider: modelProvider, id: modelId });

    // Validate model availability
    switch (modelProvider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
          return res.status(400).json({ error: 'OpenAI API key is not properly configured' });
        }
        break;
      case 'claude':
        if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY === 'your_claude_api_key_here') {
          return res.status(400).json({ error: 'Claude API key is not properly configured' });
        }
        break;
      case 'ollama':
        try {
          await axios.get('http://127.0.0.1:11434/api/tags', { timeout: 30000 });
        } catch (error) {
          return res.status(400).json({ error: 'Ollama service is not available' });
        }
        break;
    }

    // Construct the system message based on avatar information
    const systemMessage = `You are an AI assistant with the following persona:
Name: ${avatarInfo?.name || 'AI Assistant'}
Role: ${avatarInfo?.role || 'Helper'}
Description: ${avatarInfo?.description || 'A helpful AI assistant'}

Please respond to all messages in character, maintaining this persona consistently.
Format your responses using markdown for:
- Lists (using - or numbers)
- Tables (using | for columns and a header row with --- separator)
  Example table format:
  | Header 1 | Header 2 |
  |----------|----------|
  | Cell 1   | Cell 2   |
- Code blocks (using triple backticks)
- Bold text (using **text**)
- Italic text (using *text*)

Always ensure tables have proper column headers and separator rows.`;

    let response;
    console.log('Sending request to model provider:', modelProvider);

    try {
      switch (modelProvider) {
        case 'openai':
          const openaiConfig = {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 300000 // Increase to 5 minutes for complex queries
          };

          // O1 models use the chat completions endpoint
          const isO1Model = modelId.startsWith('o1-');
          
          if (isO1Model) {
            console.log('Using O1 model with chat completions endpoint');
            try {
              // Add request ID for tracking
              const requestId = `o1-${Date.now()}`;
              console.log(`[${requestId}] Starting O1 request for message:`, message);
              
              // Configure axios with keep-alive and proper timeouts
              const axiosConfig = {
                headers: {
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                  'Content-Type': 'application/json',
                  'Connection': 'keep-alive'
                },
                validateStatus: function (status) {
                  return status >= 200 && status < 500;
                },
                timeout: 300000, // Increase to 5 minutes
                maxRedirects: 5,
                proxy: false,
                decompress: true,
                httpAgent: new require('http').Agent({ 
                  keepAlive: true,
                  timeout: 300000 // Increase to 5 minutes
                }),
                httpsAgent: new require('https').Agent({ 
                  keepAlive: true,
                  timeout: 300000 // Increase to 5 minutes
                })
              };
              
              response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                  model: modelId,
                  messages: [
                    { role: "user", content: message }
                  ],
                  max_completion_tokens: 1000,
                  stream: false
                },
                axiosConfig
              );
              
              console.log(`[${requestId}] O1 model raw response:`, response.data);
              
              if (response.status !== 200) {
                console.error(`[${requestId}] Error response from O1 model:`, {
                  status: response.status,
                  data: response.data,
                  headers: response.headers
                });
                
                // Handle specific error cases
                if (response.status === 408 || response.status === 504) {
                  return res.status(504).json({
                    error: 'Request timeout',
                    details: 'The model took too long to respond. Please try again.'
                  });
                }
                
                if (response.status === 429) {
                  return res.status(429).json({
                    error: 'Rate limit exceeded',
                    details: 'Too many requests. Please wait a moment and try again.'
                  });
                }
                
                throw new Error(response.data?.error?.message || `HTTP error! status: ${response.status}`);
              }
              
              if (!response.data?.choices?.[0]?.message?.content) {
                console.error(`[${requestId}] Invalid response format:`, response.data);
                throw new Error('Invalid response format from O1 model');
              }
              
              const responseText = response.data.choices[0].message.content.trim();
              console.log(`[${requestId}] O1 model processed response:`, responseText);
              
              return res.json({
                success: true,
                response: responseText,
                timestamp: new Date(),
                requestId
              });
            } catch (o1Error) {
              console.error('Error with O1 model request:', {
                error: o1Error.message,
                code: o1Error.code,
                response: o1Error.response?.data,
                status: o1Error.response?.status,
                stack: o1Error.stack
              });
              
              // Handle various error types
              if (o1Error.code === 'ECONNABORTED' || o1Error.code === 'ETIMEDOUT') {
                return res.status(504).json({
                  error: 'Request timed out',
                  details: 'The server took too long to respond. Please try again.'
                });
              }
              
              if (o1Error.code === 'ECONNRESET' || o1Error.code === 'ECONNREFUSED') {
                return res.status(503).json({
                  error: 'Network connection error',
                  details: 'Failed to connect to the server. Please check your connection and try again.'
                });
              }
              
              if (o1Error.response?.status === 400) {
                return res.status(400).json({
                  error: 'Invalid request',
                  details: o1Error.response.data?.error?.message || 'The request was invalid'
                });
              }
              
              // Handle abort errors
              if (o1Error.name === 'AbortError' || o1Error.message.includes('aborted')) {
                return res.status(499).json({
                  error: 'Request aborted',
                  details: 'The request was cancelled. Please try again.'
                });
              }
              
              throw o1Error;
            }
          }

          // For non-O1 models, use chat completions as before
          response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: modelId,
              messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: message }
              ],
              temperature: 0.7,
              max_tokens: 1000
            },
            openaiConfig
          );
          console.log('OpenAI chat response received');
          return res.json({
            success: true,
            response: response.data.choices[0].message.content,
            timestamp: new Date()
          });

        case 'ollama':
          const ollamaConfig = {
            timeout: 300000, // 5 minute timeout
            responseType: 'stream'
          };

          response = await axios.post(
            'http://127.0.0.1:11434/api/chat',
            {
              model: modelId,
              messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: message }
              ],
            },
            ollamaConfig
          );

          let fullResponse = '';
          let isThinking = false;
          let thinkingContent = '';
          let finalContent = '';

          try {
            response.data.on('data', chunk => {
              try {
                const lines = chunk.toString().split('\n').filter(line => line.trim());
                for (const line of lines) {
                  const data = JSON.parse(line);
                  if (data.message?.content) {
                    const content = data.message.content;
                    
                    if (content.includes('<think>')) {
                      isThinking = true;
                      continue;
                    }
                    if (content.includes('</think>')) {
                      isThinking = false;
                      continue;
                    }

                    if (isThinking) {
                      thinkingContent += content;
                    } else {
                      finalContent += content;
                    }
                    
                    // Send incremental updates
                    res.write(JSON.stringify({
                      type: isThinking ? 'thinking' : 'response',
                      content: content,
                      done: false
                    }) + '\n');
                  }
                }
              } catch (err) {
                console.error('Error parsing Ollama stream chunk:', err);
                // Don't throw here, just log the error and continue
              }
            });

            await new Promise((resolve, reject) => {
              response.data.on('end', () => {
                console.log('Ollama response received');
                try {
                  res.write(JSON.stringify({
                    type: 'complete',
                    thinking: thinkingContent.trim(),
                    response: finalContent.trim(),
                    timestamp: new Date(),
                    done: true
                  }));
                  res.end();
                  resolve();
                } catch (err) {
                  console.error('Error writing final response:', err);
                  reject(err);
                }
              });

              response.data.on('error', (err) => {
                console.error('Error in Ollama stream:', err);
                reject(err);
              });

              // Add a timeout to prevent hanging
              setTimeout(() => {
                reject(new Error('Stream timeout after 5 minutes'));
              }, 300000);
            });
            return;
          } catch (streamError) {
            console.error('Error processing Ollama stream:', streamError);
            throw streamError;
          }

        case 'claude':
          response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
              model: modelId,
              messages: [
                { role: "user", content: `${systemMessage}\n\nUser: ${message}` }
              ],
              max_tokens: 1000
            },
            {
              headers: {
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
              },
              timeout: 30000 // 30 second timeout
            }
          );
          console.log('Claude response received');
          return res.json({
            success: true,
            response: response.data.content[0].text,
            timestamp: new Date()
          });

        default:
          throw new Error(`Unsupported model provider: ${modelProvider}`);
      }
    } catch (error) {
      console.error(`Error from ${modelProvider}:`, error.response?.data || error.message);
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ 
          error: 'Request timed out',
          details: `The ${modelProvider} service took too long to respond`
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing chat request:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    return res.status(statusCode).json({ 
      error: 'Failed to process message',
      details: error.response?.data?.error || error.response?.data?.message || error.message,
      provider: modelProvider,
      status: statusCode
    });
  }
});

app.get('/api/model/discover', async (req, res) => {
  const models = {
    ollama: [],
    openai: [],
    claude: []
  };

  // First check Ollama availability as it's local
  try {
    const ollamaResponse = await axios.get('http://127.0.0.1:11434/api/tags', { timeout: 30000 });
    console.log('Ollama response:', ollamaResponse.data);
    if (ollamaResponse.data?.models) {
      models.ollama = ollamaResponse.data.models.map(model => ({
        id: model.name,
        object: 'model',
        created: Date.now(),
        owned_by: 'ollama'
      }));
    }
  } catch (error) {
    console.error('Error fetching Ollama models:', error.message);
  }

  // Only try OpenAI if we have a valid API key and can reach the internet
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
      const openaiResponse = await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 5000 // Short timeout to quickly detect internet issues
      });
      console.log('OpenAI response:', openaiResponse.data);
      
      // Filter and map OpenAI models
      const filteredModels = openaiResponse.data.data.filter(model => {
        const modelId = model.id.toLowerCase();
        return modelId.includes('gpt-') || modelId.startsWith('o1-');
      });
      
      models.openai = filteredModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error.message);
    }
  }

  // Only try Claude if we have a valid API key and can reach the internet
  if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY !== 'your_claude_api_key_here') {
    try {
      // Claude model list endpoint would go here
      // Currently skipping as we don't have the endpoint
    } catch (error) {
      console.error('Error fetching Claude models:', error.message);
    }
  }

  // Get default model (prefer Ollama if available since it's local)
  const defaultModel = models.ollama.length > 0 
    ? { provider: 'ollama', id: models.ollama[0].id }
    : models.openai.length > 0
      ? { provider: 'openai', id: models.openai[0].id }
      : null;

  res.json({
    ...models,
    defaultModel
  });
});

app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.error('OpenAI API key validation failed');
    return res.status(400).json({ error: 'OpenAI API key is not properly configured' });
  }

  try {
    console.log('Generating image for prompt:', prompt);
    
    const requestData = {
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    };
    
    console.log('Making request to DALL-E API with data:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000, // 60 second timeout
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Don't reject if status is >= 400
        }
      }
    );

    if (response.status !== 200) {
      console.error('Error response from DALL-E:', response.data);
      return res.status(response.status).json({
        error: response.data.error?.message || 'Error from image service',
        details: response.data.error?.code || response.statusText
      });
    }

    console.log('DALL-E API response:', JSON.stringify(response.data, null, 2));

    if (!response.data?.data?.[0]?.url) {
      console.error('Invalid response format from DALL-E:', JSON.stringify(response.data, null, 2));
      return res.status(500).json({ 
        error: 'Invalid response from image generation service',
        details: 'Response did not contain expected image URL'
      });
    }

    console.log('Image generation successful, URL:', response.data.data[0].url);
    res.json({ imageUrl: response.data.data[0].url });
  } catch (error) {
    console.error('Error generating image:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    let errorMessage = 'Failed to generate image';
    let errorDetails = error.message;
    let statusCode = error.response?.status || 500;

    if (error.response?.data?.error) {
      errorMessage = error.response.data.error.message || errorMessage;
      errorDetails = error.response.data.error.code || errorDetails;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: errorDetails,
      status: statusCode
    });
  }
});

const PORT = process.env.PORT || 3001;

// Bind explicitly to 127.0.0.1 to force IPv4
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
}); 