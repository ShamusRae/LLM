import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EditAvatarForm from './EditAvatarForm';
import Modal from './Modal';

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

  const [formState, setFormState] = useState({
    name: '',
    role: '',
    description: '',
    skills: '',
    imagePrompt: '',
    selectedModel: '',
    imageUrl: null
  });

  useEffect(() => {
    // Fetch available models when component mounts
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
      // Get current settings
      const settingsResponse = await axios.get('/api/settings');
      const currentSettings = settingsResponse.data;

      // Update avatars list
      const updatedAvatars = avatars.some(avatar => avatar.id === updatedAvatar.id)
        ? avatars.map(avatar => avatar.id === updatedAvatar.id ? updatedAvatar : avatar)
        : [...avatars, updatedAvatar];

      // Save updated settings
      await axios.put('/api/settings', {
        ...currentSettings,
        avatars: updatedAvatars
      });

      // Update local state
      setAvatars(updatedAvatars);

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
    let newSelected;
    if (activeAvatars.some(a => a.id === avatar.id)) {
      newSelected = activeAvatars.filter(a => a.id !== avatar.id);
    } else {
      newSelected = [...activeAvatars, avatar];
    }
    console.log('Avatar toggled:', avatar, 'New active avatars:', newSelected);
    if (typeof onAvatarToggle === 'function') {
      onAvatarToggle(newSelected);
    }
  };

  // Load avatars from settings when component mounts
  useEffect(() => {
    let mounted = true;
    const loadAvatars = async () => {
      const maxRetries = 3;
      let retryCount = 0;
      
      const tryLoadAvatars = async () => {
        try {
          const response = await axios.get('/api/settings');
          if (!mounted) return;
          
          if (response.data && Array.isArray(response.data.avatars)) {
            // Ensure all avatars have valid IDs
            const validAvatars = response.data.avatars.map(avatar => ({
              ...avatar,
              id: avatar.id || Date.now() + Math.random()
            }));
            setAvatars(prev => {
              // Only update if the avatars have actually changed
              if (JSON.stringify(prev) === JSON.stringify(validAvatars)) {
                return prev;
              }
              return validAvatars;
            });
            
            // Update active avatars to remove any that no longer exist
            onAvatarToggle(prev => 
              prev.filter(active => validAvatars.some(a => a.id === active.id))
            );
          } else {
            console.warn('Invalid avatars data format:', response.data);
            // Only set default avatar if we don't already have avatars
            setAvatars(prev => {
              if (prev.length > 0) return prev;
              return [{
                id: 1,
                name: 'Default Avatar',
                role: 'AI Assistant',
                description: 'A helpful AI assistant',
                skills: ['General Assistance'],
                imageUrl: '/default-avatar.png'
              }];
            });
          }
        } catch (err) {
          console.error('Error loading avatars:', err.response ? err.response.data : err.message);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying avatar load (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            if (mounted) {
              return tryLoadAvatars();
            }
          } else {
            // After max retries, fall back to default avatar only if we don't have avatars
            if (mounted) {
              setAvatars(prev => {
                if (prev.length > 0) return prev;
                return [{
                  id: 1,
                  name: 'Default Avatar',
                  role: 'AI Assistant',
                  description: 'A helpful AI assistant',
                  skills: ['General Assistance'],
                  imageUrl: '/default-avatar.png'
                }];
              });
            }
          }
        }
      };
      
      await tryLoadAvatars();
    };
    
    loadAvatars();
    return () => {
      mounted = false;
    };
  }, []); // Only run on mount

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
          {avatars.map(avatar => (
            <div
              key={avatar.id}
              className={`relative border rounded p-3 cursor-pointer ${activeAvatars.some(a => a.id === avatar.id) ? 'border-blue-500' : ''}`}
              onClick={() => handleToggle(avatar)}
            >
              <button
                className="absolute top-2 right-2 px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(avatar);
                }}
              >
                Edit
              </button>
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
            </div>
          ))}
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