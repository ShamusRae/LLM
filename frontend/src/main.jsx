import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './state/store';
import App from './App';
import './index.css';

// Expose Vite env to config/api (avoids import.meta in api.ts so Jest can compile)
if (typeof globalThis !== 'undefined') {
  globalThis.__VITE_ENV__ = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
}

// Disable Mirage if it exists - this prevents Mirage from intercepting API requests
if (window.server && typeof window.server.shutdown === 'function') {
  console.log('Shutting down Mirage server');
  window.server.shutdown();
}

// Prevent any future Mirage initialization
window.disableMirage = true;

// Forcibly remove any mock server from the window object
if (window.server) {
  console.log('Forcibly removing Mirage server object');
  delete window.server;
}

// Check if the environment has the disable flag
if (process.env.DISABLE_MIRAGE || window.DISABLE_MIRAGE) {
  console.log('Mirage is disabled by environment configuration');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
); 