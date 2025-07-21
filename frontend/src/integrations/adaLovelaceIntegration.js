/**
 * Ada Lovelace Avatar Integration Module
 * 
 * This module provides utility functions for integrating the Ada Lovelace
 * predictive modeling avatar into the chat application.
 */

import axios from 'axios';
import { createAdaLovelaceAvatar } from '../utils/createAdaLovelaceAvatar';

/**
 * Initialize the Ada Lovelace avatar in the system
 * @returns {Promise<Object>} The initialized avatar
 */
export const initializeAdaLovelaceAvatar = async () => {
  try {
    // Create the Ada Lovelace avatar
    const adaLovelaceAvatar = createAdaLovelaceAvatar();
    
    // Check if Ada avatar exists in settings
    const response = await axios.get('/api/settings');
    const settings = response.data;
    
    if (!settings.avatars) {
      settings.avatars = [];
    }
    
    // Check if Ada Lovelace avatar already exists
    const adaExists = settings.avatars.some(avatar => avatar.id === 'ada-lovelace');
    
    // Add Ada Lovelace if not present
    if (!adaExists) {
      settings.avatars.push(adaLovelaceAvatar);
      
      // Update settings
      await axios.put('/api/settings', settings);
      
      console.log('Ada Lovelace avatar initialized successfully');
    } else {
      console.log('Ada Lovelace avatar already exists');
    }
    
    return adaLovelaceAvatar;
  } catch (error) {
    console.error('Error initializing Ada Lovelace avatar:', error);
    throw error;
  }
};

/**
 * Check if a message should be handled by the Ada Lovelace agent
 * @param {string} message - The message to check
 * @returns {boolean} True if the message should be handled by Ada
 */
export const isAdaLovelaceMessage = (message) => {
  if (!message) return false;
  
  const lowerMsg = message.toLowerCase();
  
  // Keywords related to predictive modeling and data analysis
  const adaKeywords = [
    'predict', 'model', 'analyze', 'forecast',
    'dataset', 'machine learning', 'classification',
    'regression', 'data science', 'statistics',
    'features', 'accuracy', 'train'
  ];
  
  return adaKeywords.some(keyword => lowerMsg.includes(keyword));
};

/**
 * Get a greeting message from Ada Lovelace
 * @returns {string} A greeting message
 */
export const getAdaLovelaceGreeting = () => {
  const greetings = [
    "Hello! I'm Ada Lovelace, the world's first computer programmer. I'm here to help you with predictive modeling and data analysis. Would you like to upload a dataset to get started?",
    "Greetings! I'm Ada Lovelace, ready to assist with your data science needs. Upload a dataset, and we can begin analyzing patterns and building predictive models.",
    "Welcome! I'm Ada Lovelace, pioneering mathematician and the first computer programmer. I specialize in predictive modeling. How can I help with your data analysis today?"
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
};

export default {
  initializeAdaLovelaceAvatar,
  isAdaLovelaceMessage,
  getAdaLovelaceGreeting
}; 