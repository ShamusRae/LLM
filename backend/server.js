'use strict';

const app = require('./app');
const path = require('path');
const fs = require('fs').promises;
const net = require('net');

require('dotenv').config();

/* Global error handlers to prevent crashes */
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Promise Rejection:', reason?.message || reason, promise);
});

async function initializeStorageDirectories() {
  const rootDir = path.join(__dirname, '../storage');
  const dirs = ['avatars', 'uploads', 'sessions', 'team-images', 'markdown'];
  for (const dir of dirs) {
    await fs.mkdir(path.join(rootDir, dir), { recursive: true });
  }
  console.log('Storage directories initialized.');
}

const findAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
};

const startServer = async () => {
  try {
    await initializeStorageDirectories();
    const port = await findAvailablePort(process.env.PORT || 3001);
    
    // Log all registered routes for debugging
    console.log('--- Registered Routes ---');
    app._router.stack.forEach(function(r){
      if (r.route && r.route.path){
        console.log(r.route.path)
      }
    });
    console.log('-------------------------');

    app.listen(port, () => {
      console.log(`Server running on http://127.0.0.1:${port}`);
      process.env.ACTUAL_PORT = port;
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 