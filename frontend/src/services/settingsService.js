import axios from 'axios';
import { createAdaLovelaceAvatar } from '../utils/createAdaLovelaceAvatar';

/**
 * Ensures the Ada Lovelace avatar is always included in settings
 * @param {Object} settings - The current settings object
 * @returns {Object} - Updated settings with Ada Lovelace
 */
export const ensureAdaLovelaceAvatar = (settings) => {
  if (!settings) return null;
  
  // Create a deep copy to avoid mutation
  const updatedSettings = JSON.parse(JSON.stringify(settings));
  
  // Initialize avatars array if it doesn't exist
  if (!updatedSettings.avatars) {
    updatedSettings.avatars = [];
  }
  
  // Check if Ada Lovelace avatar already exists
  const adaExists = updatedSettings.avatars.some(avatar => avatar.id === 'ada-lovelace');
  
  // Add Ada Lovelace if not present
  if (!adaExists) {
    const adaLovelaceAvatar = createAdaLovelaceAvatar();
    updatedSettings.avatars.push(adaLovelaceAvatar);
  }
  
  return updatedSettings;
};

// Update the getSettings function to ensure Ada Lovelace is included
export const getSettings = async () => {
  try {
    const response = await axios.get('/api/settings');
    let settings = response.data;
    
    // Ensure Ada Lovelace is included
    settings = ensureAdaLovelaceAvatar(settings);
    
    return settings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
}; 