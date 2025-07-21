import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EditAvatarForm from './EditAvatarForm';
import Modal from './Modal';
import { createAdaLovelaceAvatar } from '../utils/createAdaLovelaceAvatar';

// Add debugging flag - set to true to see debug info
const DEBUG = false;

const AvatarList = ({ onAvatarToggle, activeAvatars, onAvatarSelect, selectedAvatar }) => {
  const [avatars, setAvatars] = useState([
    {
      id: 1,
      name: 'Main Avatar',
      role: 'Professor',
      description: 'An experienced AI researcher',
      skills: ['Machine Learning', 'Natural Language Processing'],
      imagePrompt: 'A professional looking professor with glasses and a warm smile',
      imageUrl: null,
      selectedModel: null
    }
  ]);
  
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [models, setModels] = useState({
    ollama: [],
    openai: [],
    claude: []
  });
  
  // Add a state to track if we've loaded avatars
  const [avatarsLoaded, setAvatarsLoaded] = useState(false);
  // Add a state to track component visibility
  const [isVisible, setIsVisible] = useState(true);
  // Add a counter to force refreshes when needed
  const [refreshCounter, setRefreshCounter] = useState(0);
  // Add a reference to track if component is mounted
  const componentMounted = React.useRef(false);
  // Add a reference to track last time we loaded avatars
  const lastLoadTime = React.useRef(0);

  const [formState, setFormState] = useState({
    name: '',
    role: '',
    description: '',
    skills: '',
    imagePrompt: '',
    selectedModel: '',
    imageUrl: null
  });

  // Save avatars to localStorage when they change
  useEffect(() => {
    if (avatars && avatars.length > 0 && avatarsLoaded) {
      if (DEBUG) console.log('[DEBUG] Saving avatars to localStorage:', avatars.length);
      localStorage.setItem('cached_avatars', JSON.stringify(avatars));
    }
  }, [avatars, avatarsLoaded]);

  // Track visibility changes
  useEffect(() => {
    if (DEBUG) console.log('[DEBUG] Setting up visibility tracking');
    
    const handleVisibilityChange = () => {
      const newVisibility = document.visibilityState === 'visible';
      if (DEBUG) console.log('[DEBUG] Document visibility changed to:', newVisibility ? 'visible' : 'hidden');
      
      if (newVisibility) {
        // We've become visible again, ALWAYS force a refresh from server
        if (DEBUG) console.log('[DEBUG] Returned to Avatars tab - forcing refresh from server');
        // Force a hard refresh by resetting loaded state and triggering refresh counter
        setAvatarsLoaded(false);
        setRefreshCounter(prev => prev + 1);
      }
      setIsVisible(newVisibility);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Load models
  useEffect(() => {
    console.log('Fetching models...');
    axios.get('/api/model/discover')
      .then(res => {
        console.log('Received models:', res.data);
        if (res.data && typeof res.data === 'object') {
          setModels(res.data);
        } else {
          console.error('Invalid model data format:', res.data);
          setModels({ ollama: [], openai: [], claude: [] });
        }
      })
      .catch(err => {
        console.error('Error fetching models:', err.response || err);
        setModels({ ollama: [], openai: [], claude: [] });
      });
  }, []);

  // On mount, always force a refresh and set the mounted flag
  useEffect(() => {
    if (DEBUG) console.log('[DEBUG] AvatarList mounted');
    componentMounted.current = true;
    
    // First, try to load from localStorage immediately on mount
    const cachedAvatars = localStorage.getItem('cached_avatars');
    if (cachedAvatars) {
      try {
        const parsed = JSON.parse(cachedAvatars);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (DEBUG) console.log('[DEBUG] Using cached avatars from localStorage on mount:', parsed.length);
          
          // Check if we have a recent avatar in sessionStorage that might not be in the cache yet
          const recentAvatarJson = sessionStorage.getItem('most_recent_avatar');
          const recentAvatarTime = sessionStorage.getItem('most_recent_avatar_time');
          
          if (recentAvatarJson && recentAvatarTime) {
            try {
              const recentAvatar = JSON.parse(recentAvatarJson);
              const timeStamp = parseInt(recentAvatarTime, 10);
              
              // Only use recent avatar if it's less than 30 seconds old
              if (Date.now() - timeStamp < 30000 && recentAvatar && recentAvatar.id) {
                if (DEBUG) console.log('[DEBUG] Found recent avatar in sessionStorage:', recentAvatar.id);
                
                // See if this avatar already exists in our cached list
                let updatedCachedAvatars;
                const avatarExists = parsed.some(a => a.id === recentAvatar.id);
                
                if (avatarExists) {
                  // Replace the existing avatar
                  updatedCachedAvatars = parsed.map(a => 
                    a.id === recentAvatar.id ? recentAvatar : a
                  );
                  if (DEBUG) console.log('[DEBUG] Updated existing avatar in cached list');
                } else {
                  // Add the new avatar
                  updatedCachedAvatars = [...parsed, recentAvatar];
                  if (DEBUG) console.log('[DEBUG] Added new avatar to cached list');
                }
                
                // Update localStorage with the most recent data
                localStorage.setItem('cached_avatars', JSON.stringify(updatedCachedAvatars));
                
                // Use the updated list
                setAvatars(updatedCachedAvatars);
                return; // Skip setting avatars with the original parsed data
              }
            } catch (e) {
              console.error('Error processing recent avatar:', e);
            }
          }
          
          // If we didn't have a recent avatar or it failed, use the cached list as is
          setAvatars(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cached avatars on mount:', e);
      }
    }
    
    // Force a refresh from server on mount
    if (DEBUG) console.log('[DEBUG] Forcing refresh from server on component mount');
    setRefreshCounter(prev => prev + 1);
    
    return () => {
      if (DEBUG) console.log('[DEBUG] AvatarList unmounting');
      componentMounted.current = false;
    };
  }, []); // Empty dependency array = only run on mount/unmount

  // Load avatars from settings whenever we need to refresh
  useEffect(() => {
    if (DEBUG) console.log('[DEBUG] Avatar loading effect running (refresh count:', refreshCounter, ')');
    
    // Avoid frequent refreshes by checking time since last load (min 500ms between loads)
    const now = Date.now();
    if (now - lastLoadTime.current < 500 && avatarsLoaded) {
      if (DEBUG) console.log('[DEBUG] Skipping refresh, too soon since last load');
      return;
    }
    
    lastLoadTime.current = now;
    
    const loadAvatars = async () => {
      if (!componentMounted.current) {
        if (DEBUG) console.log('[DEBUG] Aborting avatar load - component unmounted');
        return;
      }
      
      if (DEBUG) console.log('[DEBUG] Loading avatars from settings...');
      
      try {
        // First, try to use cached avatars while waiting for the network request
        const cachedAvatars = localStorage.getItem('cached_avatars');
        if (cachedAvatars && !avatarsLoaded) {
          try {
            const parsed = JSON.parse(cachedAvatars);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (DEBUG) console.log('[DEBUG] Using cached avatars from localStorage:', parsed.length);
              if (componentMounted.current) {
                setAvatars(parsed);
              }
            }
          } catch (e) {
            console.error('Failed to parse cached avatars:', e);
          }
        }
        
        // Multiple attempts to get fresh data from the server
        let attempts = 0;
        const MAX_ATTEMPTS = 3;
        let latestAvatars = null;
        
        while (attempts < MAX_ATTEMPTS && componentMounted.current) {
          attempts++;
          if (DEBUG) console.log(`[DEBUG] Server fetch attempt ${attempts}...`);
          
          try {
            // Add cache-busting parameter to force fresh data from server
            const cacheParam = `?nocache=${Date.now()}&attempt=${attempts}`;
            const response = await axios.get(`/api/settings${cacheParam}`);
            
            if (!componentMounted.current) {
              if (DEBUG) console.log('[DEBUG] Aborting avatar processing - component unmounted');
              return;
            }
            
            if (DEBUG) {
              console.log(`[DEBUG] Fetched settings data (attempt ${attempts}):`, response.data);
              if (response.data && response.data.avatars) {
                console.log(`[DEBUG] Avatar count in settings (attempt ${attempts}):`, response.data.avatars.length);
              }
            }
            
            if (response.data && Array.isArray(response.data.avatars)) {
              latestAvatars = response.data.avatars;
              
              // Check if this response has more avatars than our previous attempt
              // If we have a most recent avatar in sessionStorage, make sure it's included
              const recentAvatarJson = sessionStorage.getItem('most_recent_avatar');
              if (recentAvatarJson) {
                try {
                  const recentAvatar = JSON.parse(recentAvatarJson);
                  if (recentAvatar && recentAvatar.id) {
                    const hasRecentAvatar = latestAvatars.some(a => a.id === recentAvatar.id);
                    if (!hasRecentAvatar) {
                      if (DEBUG) console.log('[DEBUG] Recent avatar not found in server response, continuing attempts...');
                      // Wait before next attempt
                      await new Promise(resolve => setTimeout(resolve, 500));
                      continue;
                    } else {
                      if (DEBUG) console.log('[DEBUG] Found recent avatar in server response!');
                      break;
                    }
                  }
                } catch (e) {
                  console.error('Error checking for recent avatar:', e);
                }
              }
              
              // If no recent avatar to check for, just make sure we have some data
              break;
            }
            
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            console.error(`Server fetch attempt ${attempts} failed:`, err);
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (latestAvatars && componentMounted.current) {
          // Ensure all avatars have valid IDs
          const validAvatars = latestAvatars.map(avatar => ({
            ...avatar,
            id: avatar.id || Date.now() + Math.random()
          }));
          
          if (DEBUG) console.log('[DEBUG] Setting avatars state with', validAvatars.length, 'avatars from server');
          
          // Ensure Ada Lovelace is always available
          const adaLovelaceAvatar = createAdaLovelaceAvatar();
          // Check if Ada avatar already exists
          const adaExists = validAvatars.some(avatar => avatar.id === 'ada-lovelace');
          if (!adaExists) {
            validAvatars.push(adaLovelaceAvatar);
          }
          
          // Directly set the state with the full avatar list - only if component still mounted
          if (componentMounted.current) {
            setAvatars(validAvatars);
            setAvatarsLoaded(true);
          
            // Also update the localStorage cache
            localStorage.setItem('cached_avatars', JSON.stringify(validAvatars));
          }
          
          // Only filter active avatars that no longer exist
          if (Array.isArray(activeAvatars) && activeAvatars.length > 0) {
            const validActiveAvatars = activeAvatars.filter(active => 
              validAvatars.some(a => a.id === active.id)
            );
            
            // Only call onAvatarToggle if needed and component still mounted
            if (validActiveAvatars.length !== activeAvatars.length && typeof onAvatarToggle === 'function' && componentMounted.current) {
              onAvatarToggle(validActiveAvatars);
            }
          }
        } else {
          console.warn('Could not get valid avatars data after multiple attempts');
          if (!avatarsLoaded && componentMounted.current) {
            // Use cached avatars as fallback
            const cachedAvatars = localStorage.getItem('cached_avatars');
            if (cachedAvatars) {
              try {
                const parsed = JSON.parse(cachedAvatars);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  if (DEBUG) console.log('[DEBUG] Using cached avatars as fallback:', parsed.length);
                  setAvatars(parsed);
                  setAvatarsLoaded(true);
                  return;
                }
              } catch (e) {
                console.error('Failed to parse cached avatars as fallback:', e);
              }
            }
            
            // If all else fails, use default avatar
            setAvatars([{
              id: 1,
              name: 'Default Avatar',
              role: 'AI Assistant',
              description: 'A helpful AI assistant',
              skills: ['General Assistance'],
              imageUrl: '/default-avatar.png'
            }]);
          }
        }
      } catch (err) {
        console.error('Error in avatar loading process:', err.response ? err.response.data : err.message);
        
        // If network request fails, try to use cached avatars
        if (!avatarsLoaded && componentMounted.current) {
          const cachedAvatars = localStorage.getItem('cached_avatars');
          if (cachedAvatars) {
            try {
              const parsed = JSON.parse(cachedAvatars);
              if (Array.isArray(parsed) && parsed.length > 0) {
                if (DEBUG) console.log('[DEBUG] Using cached avatars after network error:', parsed.length);
                setAvatars(parsed);
                setAvatarsLoaded(true);
              }
            } catch (e) {
              console.error('Failed to parse cached avatars:', e);
            }
          }
        }
      }
    };
    
    loadAvatars();
    
    // Add a debounced reload to handle any race conditions
    const reloadTimer = setTimeout(() => {
      if (!avatarsLoaded && componentMounted.current) {
        if (DEBUG) console.log('[DEBUG] Trying avatar reload after timeout');
        loadAvatars();
      }
    }, 1000);
    
    return () => {
      clearTimeout(reloadTimer);
    };
  }, [refreshCounter]); // Re-run when refreshCounter changes

  useEffect(() => {
    if (editingAvatar) {
      setFormState({
        name: editingAvatar.name || '',
        role: editingAvatar.role || '',
        description: editingAvatar.description || '',
        skills: editingAvatar.skills?.join(', ') || '',
        imagePrompt: editingAvatar.imagePrompt || '',
        selectedModel: editingAvatar.selectedModel || '',
        imageUrl: editingAvatar.imageUrl || null
      });
    }
  }, [editingAvatar]);

  const handleEdit = (avatar) => {
    if (avatar.id === 'ada-lovelace' && avatar.undeletable) {
      alert('Ada Lovelace avatar cannot be modified as it is a system avatar.');
      return;
    }
    setEditingAvatar({ ...avatar });
    setIsEditing(true);
  };

  const handleChange = React.useCallback((field, value) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleGenerateImage = async () => {
    if (!formState.imagePrompt) {
      alert('Please enter an image description first');
      return;
    }

    setIsGenerating(true);
    console.log('Generating image with prompt:', formState.imagePrompt);

    try {
      // Generate image with DALL-E
      const response = await axios.post(
        '/api/generate-image',
        { prompt: formState.imagePrompt },
        { 
          timeout: 60000,
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Server returned status ${response.status}: ${response.data?.error || 'Unknown error'}`);
      }

      if (!response.data?.imageUrl) {
        throw new Error('No image URL in response');
      }

      // Save the generated image to our backend storage
      const saveResponse = await axios.post(
        '/api/settings/avatar',
        { imageUrl: response.data.imageUrl }
      );

      if (!saveResponse.data?.imageUrl) {
        throw new Error('Failed to save image');
      }

      // Update form state with the local URL
      handleChange('imageUrl', saveResponse.data.imageUrl);
    } catch (error) {
      console.error('Image generation failed:', error);
      let errorMessage = 'Failed to generate image: ';

      if (error.code === 'ECONNABORTED') {
        errorMessage += 'Request timed out after 60 seconds';
      } else if (error.response) {
        errorMessage += error.response.data?.error || error.response.data?.message || error.message;
      } else if (error.request) {
        errorMessage += 'No response from server. Please check your connection.';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }

      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = React.useCallback(async (e) => {
    e.preventDefault();
    
    if (!formState.name.trim()) {
      alert('Please enter a name for the avatar');
      return;
    }

    const updatedAvatar = {
      ...editingAvatar,
      id: editingAvatar?.id || Date.now(),
      name: formState.name.trim(),
      role: formState.role.trim(),
      description: formState.description.trim(),
      skills: formState.skills.split(',').map(skill => skill.trim()).filter(Boolean),
      imagePrompt: formState.imagePrompt.trim(),
      selectedModel: formState.selectedModel,
      imageUrl: formState.imageUrl
    };

    try {
      if (DEBUG) console.log('[DEBUG] Submitting avatar:', updatedAvatar);
      
      // Get current settings
      const settingsResponse = await axios.get('/api/settings');
      const currentSettings = settingsResponse.data;
      
      if (DEBUG) {
        console.log('[DEBUG] Current settings avatars count before update:', 
          currentSettings && currentSettings.avatars ? currentSettings.avatars.length : 0);
        console.log('[DEBUG] Current avatars:', 
          currentSettings && currentSettings.avatars ? currentSettings.avatars.map(a => a.id) : []);
      }

      // Update avatars list - check if we're updating an existing avatar or adding a new one
      const isExisting = avatars.some(avatar => avatar.id === updatedAvatar.id);
      let updatedAvatars = isExisting
        ? avatars.map(avatar => avatar.id === updatedAvatar.id ? updatedAvatar : avatar)
        : [...avatars, updatedAvatar];
      
      // Ensure we have unique IDs
      const avatarIds = new Set();
      updatedAvatars = updatedAvatars.filter(avatar => {
        if (!avatar.id) return false;
        
        // Convert ID to string for consistent comparison
        const idStr = String(avatar.id);
        if (avatarIds.has(idStr)) {
          if (DEBUG) console.log('[DEBUG] Filtered out duplicate avatar with ID:', idStr);
          return false;
        }
        
        avatarIds.add(idStr);
        return true;
      });
      
      if (DEBUG) {
        console.log('[DEBUG] New avatars array length after update:', updatedAvatars.length);
        console.log('[DEBUG] New avatar IDs:', updatedAvatars.map(a => a.id));
      }

      // IMPORTANT: Update local state BEFORE saving to ensure immediate UI update
      setAvatars(updatedAvatars);
      setAvatarsLoaded(true);
      if (DEBUG) console.log('[DEBUG] Local state updated with new avatars');
      
      // ALSO immediately save to localStorage for persistence
      if (DEBUG) console.log('[DEBUG] Saving updated avatars to localStorage');
      localStorage.setItem('cached_avatars', JSON.stringify(updatedAvatars));

      // Create a new settings object to ensure we don't mutate the original
      const updatedSettings = {
        ...currentSettings,
        avatars: updatedAvatars
      };

      if (DEBUG) console.log('[DEBUG] Saving settings with', updatedAvatars.length, 'avatars');
      
      // Save updated settings
      const saveResponse = await axios.put('/api/settings', updatedSettings);
      
      if (DEBUG) {
        console.log('[DEBUG] Settings update response status:', saveResponse.status);
        console.log('[DEBUG] Settings update response data:', JSON.stringify(saveResponse.data));
      }
      
      // Wait a moment before verifying to allow backend to flush data to disk
      if (DEBUG) console.log('[DEBUG] Waiting 1 second before verifying save...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Multiple verification attempts in case of filesystem delays
      let verifySuccess = false;
      let verifyAttempts = 0;
      const MAX_VERIFY_ATTEMPTS = 3;
      
      while (!verifySuccess && verifyAttempts < MAX_VERIFY_ATTEMPTS) {
        verifyAttempts++;
        if (DEBUG) console.log(`[DEBUG] Verification attempt ${verifyAttempts}...`);
        
        try {
          // Verify the saved data matches what we sent
          const verifyResponse = await axios.get(`/api/settings?verify=${Date.now()}`);
          
          if (DEBUG) {
            console.log('[DEBUG] Verification - Response status:', verifyResponse.status);
            console.log('[DEBUG] Verification - Response data:', JSON.stringify(verifyResponse.data));
            console.log('[DEBUG] Verification - Avatars count after save:', 
              verifyResponse.data.avatars ? verifyResponse.data.avatars.length : 0);
            console.log('[DEBUG] Verification - Avatar IDs after save:', 
              verifyResponse.data.avatars ? verifyResponse.data.avatars.map(a => a.id) : []);
          }
          
          // Check if the saved data matches what we expect
          if (verifyResponse.data.avatars && 
              verifyResponse.data.avatars.length === updatedAvatars.length) {
            if (DEBUG) console.log('[DEBUG] Verification successful!');
            verifySuccess = true;
          } else {
            console.warn(`[DEBUG] Avatar count mismatch after save! Expected ${updatedAvatars.length} but got ${
              verifyResponse.data.avatars ? verifyResponse.data.avatars.length : 0
            }`);
            
            // Wait longer between retries
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error('Error verifying save:', err);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If verification failed, force a hard refresh
      if (!verifySuccess) {
        console.warn('[DEBUG] Could not verify save after multiple attempts. Forcing refresh...');
        setTimeout(() => setRefreshCounter(prev => prev + 1), 500);
      }

      // IMPORTANT: Store the newly saved avatar in sessionStorage
      // This ensures that even if the component unmounts during navigation,
      // we have a record of the most recent avatar to display
      sessionStorage.setItem('most_recent_avatar', JSON.stringify(updatedAvatar));
      sessionStorage.setItem('most_recent_avatar_time', Date.now().toString());

      // Show a confirmation message
      if (!editingAvatar) {
        alert('Avatar created successfully!');
      } else {
        alert('Avatar updated successfully!');
      }

      setIsEditing(false);
      setEditingAvatar(null);
      setFormState({
        name: '',
        role: '',
        description: '',
        skills: '',
        imagePrompt: '',
        selectedModel: '',
        imageUrl: null
      });
    } catch (error) {
      console.error('Error saving avatar:', error);
      alert('Failed to save avatar: ' + (error.response?.data?.error || error.message));
    }
  }, [formState, editingAvatar, avatars]);

  const handleCancel = React.useCallback(() => {
    setIsEditing(false);
    setEditingAvatar(null);
    setFormState({
      name: '',
      role: '',
      description: '',
      skills: '',
      imagePrompt: '',
      selectedModel: '',
      imageUrl: null
    });
  }, []);

  const handleToggle = (avatar) => {
    try {
      let newSelected;
      if (activeAvatars.some(a => a.id === avatar.id)) {
        newSelected = activeAvatars.filter(a => a.id !== avatar.id);
      } else {
        newSelected = [...activeAvatars, avatar];
      }
      console.log('Avatar toggled:', avatar.id, 'New active avatars:', newSelected);
      
      // Add validation to ensure we're passing a valid array
      if (!Array.isArray(newSelected)) {
        console.error('Invalid avatar selection: not an array');
        return;
      }
      
      // Verify each avatar has a valid ID
      const validAvatars = newSelected.filter(a => a && a.id !== undefined);
      if (validAvatars.length !== newSelected.length) {
        console.warn('Some avatars were invalid and filtered out');
      }
      
      if (typeof onAvatarToggle === 'function') {
        onAvatarToggle(validAvatars);
      }
    } catch (error) {
      console.error('Error toggling avatar:', error);
      // Don't propagate the error to prevent WebSocket disconnection
    }
  };

  const handleDelete = async (avatarId) => {
    if (!avatarId) return;
    
    // Confirm deletion with the user
    if (!window.confirm('Are you sure you want to delete this avatar?')) {
      return;
    }
    
    try {
      // Filter out the avatar from local state
      const updatedAvatars = avatars.filter(avatar => avatar.id !== avatarId);
      
      // Update the local state immediately for responsive UI
      setAvatars(updatedAvatars);
      
      // Remove from active avatars if it's selected
      if (activeAvatars.some(a => a.id === avatarId)) {
        const updatedActiveAvatars = activeAvatars.filter(a => a.id !== avatarId);
        if (typeof onAvatarToggle === 'function') {
          onAvatarToggle(updatedActiveAvatars);
        }
      }
      
      // Update localStorage
      localStorage.setItem('cached_avatars', JSON.stringify(updatedAvatars));
      
      // Get current settings
      const settingsResponse = await axios.get('/api/settings');
      const currentSettings = settingsResponse.data;
      
      // Create updated settings
      const updatedSettings = {
        ...currentSettings,
        avatars: updatedAvatars
      };
      
      // Save to the server
      await axios.put('/api/settings', updatedSettings);
      
      console.log(`Avatar ${avatarId} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting avatar: ${error.message}`);
      // Refresh to restore the correct state
      setRefreshCounter(prev => prev + 1);
    }
  };

  const getAvatarImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('data:')) return imageUrl;
    
    // Clean up the URL path and ensure it starts with /avatars/
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return path.startsWith('/avatars/') ? path : `/avatars${path}`;
  };

  const handleImageError = (e, avatarName) => {
    console.error(`Failed to load avatar image for ${avatarName}`);
    e.target.onerror = null; // Prevent infinite error loop
    
    // Create a canvas to generate the fallback image
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = `#${getRandomColor()}`;
    ctx.fillRect(0, 0, 150, 150);
    
    // Draw text
    const initials = avatarName
      ? avatarName.split(' ').map(n => n[0]).join('').toUpperCase()
      : 'A';
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 75, 75);
    
    // Convert to data URL and set as src
    e.target.src = canvas.toDataURL('image/png');
  };

  // Helper function to generate a random color for the avatar background
  const getRandomColor = () => {
    const colors = ['9B59B6', '3498DB', '1ABC9C', 'F1C40F', 'E74C3C'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Helper function to get contrasting text color
  const getTextColor = () => 'FFFFFF';

  // Add this new component for tool configuration
  const ToolConfig = ({ avatar, onToolToggle }) => {
    const [showTools, setShowTools] = useState(false);
    
    // Get the list of enabled tools for this avatar
    const enabledTools = avatar.enabledTools || [];
    const availableTools = avatar.availableTools || [];
    
    // Toggle a specific tool on/off
    const toggleTool = (toolId) => {
      const isEnabled = enabledTools.includes(toolId);
      let newEnabledTools;
      
      if (isEnabled) {
        // Remove the tool
        newEnabledTools = enabledTools.filter(id => id !== toolId);
      } else {
        // Add the tool
        newEnabledTools = [...enabledTools, toolId];
      }
      
      onToolToggle(avatar.id, newEnabledTools);
    };
    
    return (
      <div className="mt-2">
        <button 
          onClick={() => setShowTools(!showTools)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showTools ? 'Hide Tools' : 'Configure Tools'}
        </button>
        
        {showTools && (
          <div className="mt-2 p-2 bg-gray-50 rounded border">
            <h4 className="text-sm font-medium mb-2">Available Tools</h4>
            {availableTools.map(tool => (
              <div key={tool.id} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id={`tool-${avatar.id}-${tool.id}`}
                  checked={enabledTools.includes(tool.id)}
                  onChange={() => toggleTool(tool.id)}
                  className="mr-2"
                />
                <label 
                  htmlFor={`tool-${avatar.id}-${tool.id}`}
                  className="text-sm cursor-pointer"
                >
                  {tool.name}
                </label>
              </div>
            ))}
            {availableTools.length === 0 && (
              <p className="text-xs text-gray-500">No tools available</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Add a new handler for tool toggling in the AvatarList component
  const handleToolToggle = (avatarId, enabledTools) => {
    // Find the avatar to update
    const updatedAvatars = activeAvatars.map(avatar => {
      if (avatar.id === avatarId) {
        return { ...avatar, enabledTools };
      }
      return avatar;
    });
    
    // Call the parent handler with updated avatars
    onAvatarToggle(updatedAvatars);
  };

  // Add one more method to trigger refresh when component is shown 
  useEffect(() => {
    // This will run every time the component renders
    if (DEBUG) console.log('[DEBUG] AvatarList component rendered/re-rendered');
    
    // Only schedule a refresh if we haven't loaded avatars yet
    if (!avatarsLoaded) {
      if (DEBUG) console.log('[DEBUG] Scheduling initial refresh, avatars not loaded yet');
      // Schedule a refresh for when we return from other tabs
      const refreshTimer = setTimeout(() => {
        if (DEBUG) console.log('[DEBUG] Running scheduled refresh');
        setRefreshCounter(prev => prev + 1);
      }, 50);
      
      return () => {
        clearTimeout(refreshTimer);
      };
    } else {
      if (DEBUG) console.log('[DEBUG] Skipping scheduled refresh, avatars already loaded');
    }
  }, [avatarsLoaded]);

  // Display debug info if enabled
  if (DEBUG) {
    console.log('[DEBUG] Rendering AvatarList with', avatars?.length || 0, 'avatars');
    if (avatars?.length > 0) {
      console.log('[DEBUG] Avatar IDs being rendered:', avatars.map(a => a.id));
    }
  }

  return (
    <div className="border rounded bg-white">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-bold">Avatars</h2>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => handleEdit({
            id: Date.now(),
            name: '',
            role: '',
            description: '',
            skills: [],
            imagePrompt: '',
            selectedModel: '',
            imageUrl: null
          })}
        >
          Add Avatar
        </button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4">
          {Array.isArray(avatars) && avatars.length > 0 ? (
            avatars.map(avatar => {
              if (DEBUG) console.log('[DEBUG] Rendering avatar:', avatar.id, avatar.name);
              return (
                <div
                  key={avatar.id}
                  className={`relative border rounded p-3 cursor-pointer ${activeAvatars.some(a => a.id === avatar.id) ? 'border-blue-500' : ''}`}
                  onClick={() => handleToggle(avatar)}
                >
                  <div className="absolute top-2 right-2 flex">
                    {!avatar.undeletable && (
                      <button
                        className="mr-2 px-2 py-1 text-sm text-red-500 hover:text-red-700 bg-gray-100 hover:bg-gray-200 rounded flex items-center"
                        title="Delete avatar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(avatar.id);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <button
                      className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(avatar);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16">
                        <img
                          src={getAvatarImageUrl(avatar.imageUrl)}
                          alt={avatar.name}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => handleImageError(e, avatar.name)}
                        />
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold truncate">{avatar.name}</h3>
                      {avatar.role && <p className="text-gray-600 text-sm truncate">{avatar.role}</p>}
                      {activeAvatars.some(a => a.id === avatar.id) && (
                        <span className="text-sm text-green-600 font-semibold">Selected</span>
                      )}
                    </div>
                  </div>
                  {activeAvatars.some(a => a.id === avatar.id) && (
                    <ToolConfig 
                      avatar={avatar} 
                      onToolToggle={handleToolToggle} 
                    />
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>No avatars to display. Add your first avatar!</p>
            </div>
          )}
        </div>
      </div>
      {isEditing && (
        <EditAvatarForm
          formState={formState}
          setFormState={setFormState}
          handleSubmit={handleSubmit}
          handleCancel={handleCancel}
          isGenerating={isGenerating}
          handleGenerateImage={handleGenerateImage}
          models={models}
        />
      )}
    </div>
  );
};

export default AvatarList; 