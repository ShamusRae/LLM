'use strict';

const app = require('./app');
const path = require('path');
const fs = require('fs').promises;
const net = require('net');

require('dotenv').config({ path: '../.env' });

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

    // Create HTTP server for WebSocket support
    const http = require('http');
    const server = http.createServer(app);

    // Initialize professional consulting infrastructure
    console.log('🚀 Initializing professional consulting infrastructure...');
    
    try {
      // Initialize consulting orchestrator with database
      const ConsultingOrchestrator = require('./services/consulting/consultingOrchestrator');
      const ConsultingWebSocketService = require('./services/websocket/consultingWebSocket');
      
      const consultingOrchestrator = new ConsultingOrchestrator();
      await consultingOrchestrator.initialize();
      
      // Initialize WebSocket service
      const consultingWebSocket = new ConsultingWebSocketService(server, consultingOrchestrator.database);
      
      // Connect WebSocket service to orchestrator
      consultingOrchestrator.setWebSocketService(consultingWebSocket);
      
      // Make orchestrator globally available for routes
      app.set('consultingOrchestrator', consultingOrchestrator);
      app.set('consultingWebSocket', consultingWebSocket);
      
      console.log('✅ Professional consulting infrastructure initialized');
      
    } catch (infraError) {
      console.warn('⚠️ Consulting infrastructure initialization failed, falling back to basic mode:', infraError.message);
      // Continue with basic functionality - graceful fallback
    }

    server.listen(port, () => {
      console.log(`🌟 Professional Consulting Platform running on http://127.0.0.1:${port}`);
      console.log(`📡 WebSocket endpoint: ws://127.0.0.1:${port}/ws/consulting`);
      process.env.ACTUAL_PORT = port;
    });
    
    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log('🔄 Shutting down gracefully...');
      
      const consultingOrchestrator = app.get('consultingOrchestrator');
      const consultingWebSocket = app.get('consultingWebSocket');
      
      Promise.all([
        consultingOrchestrator?.database?.close(),
        consultingWebSocket?.close()
      ]).then(() => {
        console.log('✅ Professional infrastructure shutdown complete');
        process.exit(0);
      }).catch((error) => {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      });
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('❌ Failed to start professional consulting platform:', error);
    process.exit(1);
  }
};

startServer(); 