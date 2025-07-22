'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const app = express();

require('dotenv').config();

// Middleware
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
const storageDir = path.join(__dirname, '../storage');
app.use('/avatars', express.static(path.join(storageDir, 'avatars')));
app.use('/uploads', express.static(path.join(storageDir, 'uploads')));
app.use('/team-images', express.static(path.join(storageDir, 'team-images')));

// Import routes
const fileRoutes = require('./routes/file.routes');
const chatRoutes = require('./routes/chat.routes');
const settingsRoutes = require('./routes/settings.routes');
const mcpRoutes = require('./routes/mcp.routes');
const teamRoutes = require('./routes/team.routes');
const llmRoutes = require('./routes/llm.routes');
const modelRoutes = require('./routes/model.routes');
const consultingRoutes = require('./routes/consulting');
const chooseAvatarController = require('./controllers/chooseAvatar.controller');

// Register routes
app.use('/api/file', fileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/model', modelRoutes);
app.use('/api/consulting', consultingRoutes);
app.post('/api/choose-avatar', chooseAvatarController.chooseAvatar);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'llm-chat-backend', 
    timestamp: new Date().toISOString() 
  });
});

module.exports = app; 