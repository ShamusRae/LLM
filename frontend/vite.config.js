import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// Get ports from environment variables with fallbacks
const apiPort = process.env.VITE_API_PORT || 3001;
const frontendPort = process.env.FRONTEND_PORT || 5173;

export default defineConfig({
  plugins: [
    react(),
    svgr({ 
      svgrOptions: {
        // svgr options
      },
    }),
  ],
  server: {
    host: 'localhost',
    port: frontendPort,
    strictPort: true, // start.sh already discovers a free port
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: frontendPort,
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/ws': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/avatars': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    // Disable Mirage in all environments
    'process.env.DISABLE_MIRAGE': JSON.stringify(true),
    'window.DISABLE_MIRAGE': true
  }
}); 