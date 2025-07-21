/**
 * RD-Agent Service
 * 
 * Handles interactions with the RD-Agent Avatar Wrapper API for predictive modeling
 */

import axios from 'axios';

// Base URL for the Avatar Agent Wrapper API - now in modules directory
const API_BASE_URL = process.env.REACT_APP_RD_AGENT_API_URL || 'http://localhost:3002/api';

// Default polling options
const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds between requests
const DEFAULT_POLL_TIMEOUT = 60000; // 1 minute before giving up

/**
 * Start a new predictive modeling job
 * @param {Object} config The configuration for the RD-Agent
 * @returns {Promise<Object>} The API response with jobId
 */
export const startModelingJob = async (config) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/run-flow`, config);
    console.log('Started modeling job:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error starting modeling job:', error);
    throw error;
  }
};

/**
 * Get the results of a modeling job
 * @param {string} jobId The job ID to retrieve results for
 * @param {boolean} wait Whether to wait for completion
 * @param {number} timeout Maximum time to wait (in ms)
 * @returns {Promise<Object>} The job results
 */
export const getModelingResults = async (jobId, wait = false, timeout = DEFAULT_POLL_TIMEOUT) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/flow-results/${jobId}?wait=${wait}&timeout=${timeout}`
    );
    
    // If the job is still pending but we're not waiting, just return the status
    if (response.status === 202) {
      return response.data;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting modeling results:', error);
    throw error;
  }
};

/**
 * Check the status of a modeling job
 * @param {string} jobId The job ID to check
 * @returns {Promise<Object>} The job status
 */
export const getModelingStatus = async (jobId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/flow-status/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking modeling status:', error);
    throw error;
  }
};

/**
 * Poll for modeling job results until completion
 * @param {string} jobId The job ID to poll for
 * @param {Object} options Polling options
 * @param {number} options.interval Time between polls (ms)
 * @param {number} options.timeout Maximum time to poll (ms)
 * @param {Function} options.onProgress Progress callback
 * @returns {Promise<Object>} The final job results
 */
export const pollForResults = async (jobId, options = {}) => {
  const interval = options.interval || DEFAULT_POLL_INTERVAL;
  const timeout = options.timeout || DEFAULT_POLL_TIMEOUT;
  const onProgress = options.onProgress || (() => {});
  
  const startTime = Date.now();
  let elapsedTime = 0;
  let pollCount = 0;
  
  return new Promise((resolve, reject) => {
    const checkResults = async () => {
      try {
        pollCount++;
        elapsedTime = Date.now() - startTime;
        
        // Check if we've exceeded the timeout
        if (elapsedTime >= timeout) {
          reject(new Error(`Polling timeout exceeded (${timeout}ms) for job ${jobId}`));
          return;
        }
        
        // Call progress callback
        onProgress({
          jobId,
          pollCount,
          elapsedTime,
          timeoutAt: startTime + timeout
        });
        
        // Get the latest results
        const response = await axios.get(`${API_BASE_URL}/flow-results/${jobId}?wait=false`);
        
        // Check if the job is completed
        if (response.data.status === 'success' && response.data.results) {
          resolve(response.data.results);
          return;
        }
        
        // Check if the job failed
        if (response.data.status === 'error') {
          reject(new Error(`Job failed: ${response.data.message}`));
          return;
        }
        
        // If still running, continue polling
        setTimeout(checkResults, interval);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          reject(new Error(`Job ${jobId} not found`));
          return;
        }
        
        console.error(`Error polling job ${jobId}:`, error);
        
        // For network errors, keep trying
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
          setTimeout(checkResults, interval);
          return;
        }
        
        reject(error);
      }
    };
    
    // Start polling
    checkResults();
  });
};

/**
 * Terminate a running modeling job
 * @param {string} jobId The job ID to terminate
 * @returns {Promise<Object>} The termination result
 */
export const terminateModelingJob = async (jobId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/flow/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Error terminating modeling job:', error);
    throw error;
  }
};

export default {
  startModelingJob,
  getModelingResults,
  getModelingStatus,
  pollForResults,
  terminateModelingJob
}; 