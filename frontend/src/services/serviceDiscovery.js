/**
 * Service Discovery Module
 *
 * This module handles dynamic discovery of backend services by trying
 * ports until it finds the requested service.
 */

import axios from 'axios';

// Cache discovered endpoints
const serviceCache = {
  backend: null,
  avatarWrapper: null,
};

// Get configured ports from environment variables if available
const API_PORT = import.meta.env.VITE_API_PORT; 
const WRAPPER_PORT = import.meta.env.VITE_WRAPPER_PORT;

// Port ranges to try for each service
const PORT_RANGES = {
  backend: { start: API_PORT || 3001, end: API_PORT ? API_PORT : 3050 },
  avatarWrapper: { start: WRAPPER_PORT || 3051, end: WRAPPER_PORT ? WRAPPER_PORT : 3100 },
};

// For development environments, prefer localhost over relative URLs
const isDevelopment = import.meta.env.DEV;

/**
 * Discovers a service by checking ports until a health endpoint responds
 * 
 * @param {string} serviceName - Name of the service to discover ('backend' or 'avatarWrapper')
 * @param {boolean} forceRefresh - Whether to ignore cached endpoints and rediscover
 * @returns {Promise<string>} - Base URL of the discovered service
 */
export const discoverService = async (serviceName, forceRefresh = false) => {
  // Return cached value if available and not forcing refresh
  if (!forceRefresh && serviceCache[serviceName]) {
    return serviceCache[serviceName];
  }

  const range = PORT_RANGES[serviceName];
  if (!range) {
    throw new Error(`Unknown service: ${serviceName}`);
  }
  
  // If we have an exact port from environment variables, use it directly
  if (range.start === range.end && range.start) {
    const baseUrl = `http://localhost:${range.start}`;
    console.log(`Using configured ${serviceName} at ${baseUrl}`);
    serviceCache[serviceName] = baseUrl;
    return baseUrl;
  }

  // Get health endpoint path for the service
  const healthPath = serviceName === 'backend' ? '/api/health' : '/health';
  
  // In development mode with Vite, relative URLs for backend are handled by the proxy
  if (isDevelopment && serviceName === 'backend' && !forceRefresh) {
    console.log(`Using relative URL for ${serviceName} in development mode`);
    serviceCache[serviceName] = '';
    return '';
  }

  // Try ports in range
  for (let port = range.start; port <= range.end; port++) {
    const baseUrl = `http://localhost:${port}`;
    try {
      const response = await axios.get(`${baseUrl}${healthPath}`, {
        timeout: 1000, // Short timeout for quick discovery
      });
      
      if (response.status === 200) {
        console.log(`Discovered ${serviceName} at ${baseUrl}`);
        serviceCache[serviceName] = baseUrl;
        return baseUrl;
      }
    } catch (error) {
      // Continue trying next port
      continue;
    }
  }

  // If all ports failed, try to connect to default ports as fallback
  const defaultPort = serviceName === 'backend' ? 3001 : 3002;
  const fallbackUrl = `http://localhost:${defaultPort}`;
  
  console.warn(`Could not discover ${serviceName}, falling back to ${fallbackUrl}`);
  serviceCache[serviceName] = fallbackUrl;
  return fallbackUrl;
};

/**
 * Creates an axios instance configured for a specific service
 * 
 * @param {string} serviceName - Name of the service ('backend' or 'avatarWrapper')
 * @returns {Promise<AxiosInstance>} - Configured axios instance
 */
export const getServiceClient = async (serviceName) => {
  const baseURL = await discoverService(serviceName);
  
  return axios.create({
    baseURL,
    timeout: 30000,
  });
};

export default {
  discoverService,
  getServiceClient,
}; 