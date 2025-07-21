/**
 * API Service
 * 
 * Centralized API client for all backend communication with dynamic service discovery
 */

import axios from 'axios';
import { discoverService, getServiceClient } from './serviceDiscovery';

// Default timeout
const DEFAULT_TIMEOUT = 30000;

/**
 * Create a configured API instance for the backend
 */
export const getBackendClient = async () => {
  return getServiceClient('backend');
};

/**
 * Create a configured API instance for the avatar wrapper
 */
export const getAvatarWrapperClient = async () => {
  return getServiceClient('avatarWrapper');
};

/**
 * API method for file operations
 */
export const fileApi = {
  listFiles: async () => {
    const client = await getBackendClient();
    return client.get('/api/file/list');
  },

  uploadFile: async (file) => {
    const client = await getBackendClient();
    const formData = new FormData();
    formData.append('file', file);
    
    return client.post('/api/file/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  deleteFile: async (fileId) => {
    const client = await getBackendClient();
    return client.delete(`/api/file/${fileId}`);
  }
};

/**
 * API methods for chat operations
 */
export const chatApi = {
  sendMessage: async (message, sessionId, avatarId, options = {}) => {
    const client = await getBackendClient();
    return client.post('/api/chat/send', {
      message,
      sessionId,
      avatarId,
      ...options
    });
  },
  
  getSession: async (sessionId) => {
    const client = await getBackendClient();
    return client.get(`/api/chat/session/${sessionId}`);
  },
  
  listSessions: async () => {
    const client = await getBackendClient();
    return client.get('/api/chat/sessions');
  },
  
  saveSession: async (sessionData) => {
    const client = await getBackendClient();
    return client.post('/api/chat/session', sessionData);
  }
};

/**
 * API methods for avatar operations
 */
export const avatarApi = {
  runAvatarPrediction: async (config) => {
    const client = await getAvatarWrapperClient();
    return client.post('/api/run-flow', config);
  },
  
  getResults: async (jobId, options = {}) => {
    const client = await getAvatarWrapperClient();
    return client.get(`/api/flow-results/${jobId}`, { params: options });
  }
};

/**
 * API methods for settings
 */
export const settingsApi = {
  getSettings: async () => {
    const client = await getBackendClient();
    return client.get('/api/settings');
  },
  
  updateSettings: async (settings) => {
    const client = await getBackendClient();
    return client.put('/api/settings', settings);
  }
};

export default {
  fileApi,
  chatApi,
  avatarApi,
  settingsApi,
  getBackendClient,
  getAvatarWrapperClient
}; 