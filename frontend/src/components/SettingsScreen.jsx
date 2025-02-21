import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SettingsScreen = () => {
  const navigate = useNavigate();
  const [defaultLLM, setDefaultLLM] = useState('');
  const [fileClassificationModel, setFileClassificationModel] = useState('');
  const [userDetails, setUserDetails] = useState({
    name: '',
    title: '',
    description: '',
    imageUrl: null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [memory, setMemory] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const availableLLMs = [
    { value: 'gpt4', label: 'GPT-4' },
    { value: 'gpt3.5', label: 'GPT-3.5' },
    { value: 'deepseek r1 32b', label: 'Deepseek R1 32b' },
    { value: 'gpt4o mini', label: 'GPT4o Mini' }
  ];

  const classificationModels = [
    { value: 'deepseek r1 32b', label: 'Deepseek R1 32b' },
    { value: 'gpt4o mini', label: 'GPT4o Mini' }
  ];

  // Load current settings on mount
  useEffect(() => {
    axios.get('http://localhost:3001/api/settings')
      .then(res => {
        if (res.data) {
          setDefaultLLM(res.data.defaultLLM || '');
          setFileClassificationModel(res.data.fileClassificationModel || '');
          setUserDetails(res.data.userDetails || { name: '', title: '', description: '', imageUrl: null });
          setMemory(res.data.memory || []);
        }
      })
      .catch(err => {
        console.error('Error loading settings:', err);
        setError('Failed to load settings. Please try again.');
        setIsOffline(true);
      });
  }, []);

  const handleUserDetailChange = (e) => {
    const { name, value } = e.target;
    setUserDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addMemoryItem = () => {
    setMemory([...memory, '']);
  };

  const handleMemoryChange = (index, value) => {
    const newMemory = [...memory];
    newMemory[index] = value;
    setMemory(newMemory);
  };

  const removeMemoryItem = (index) => {
    const newMemory = [...memory];
    newMemory.splice(index, 1);
    setMemory(newMemory);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const settings = {
      defaultLLM,
      fileClassificationModel,
      userDetails,
      memory
    };

    try {
      await axios.post('http://localhost:3001/api/settings', settings);
      navigate('/');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleGenerateImage = async (prompt) => {
    if (!prompt) {
      alert('Please enter an image description first');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await axios.post('/api/generate-image', { prompt });
      if (!response.data?.imageUrl) {
        throw new Error('No image URL in response');
      }

      // Save the generated image as user image
      const saveResponse = await axios.post('/api/settings/user-image', {
        imageUrl: response.data.imageUrl
      });

      setUserDetails(prev => ({
        ...prev,
        imageUrl: saveResponse.data.imageUrl
      }));
    } catch (err) {
      console.error('Error generating/saving image:', err);
      setError('Failed to generate or save image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/settings/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUserDetails(prev => ({
        ...prev,
        imageUrl: response.data.imageUrl
      }));
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 text-lg font-medium">Error</h2>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
          >
            Return to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Model Settings Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Model Settings</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default LLM
                </label>
                <select
                  value={defaultLLM}
                  onChange={e => setDefaultLLM(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isOffline}
                >
                  <option value="">Select a default LLM</option>
                  {availableLLMs.map(llm => (
                    <option key={llm.value} value={llm.value}>
                      {llm.label}
                    </option>
                  ))}
                </select>
                {isOffline && (
                  <p className="mt-1 text-sm text-red-600">
                    Unable to load models. Please check your connection.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Classification Model
                </label>
                <select
                  value={fileClassificationModel}
                  onChange={e => setFileClassificationModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isOffline}
                >
                  <option value="">Select a classification model</option>
                  {classificationModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* User Details Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">User Details</h2>
            <div className="grid grid-cols-1 gap-6">
              {/* Profile Image Section */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Image
                </label>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {userDetails.imageUrl ? (
                      <img
                        src={userDetails.imageUrl}
                        alt="User profile"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow space-y-3">
                    <div className="flex flex-col space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Or enter image description for DALL-E"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={userDetails.imagePrompt || ''}
                          onChange={(e) => setUserDetails(prev => ({
                            ...prev,
                            imagePrompt: e.target.value
                          }))}
                        />
                        <button
                          type="button"
                          onClick={() => handleGenerateImage(userDetails.imagePrompt)}
                          disabled={isGenerating || !userDetails.imagePrompt}
                          className={`mt-2 w-full px-4 py-2 rounded-md text-white ${
                            isGenerating || !userDetails.imagePrompt
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {isGenerating ? 'Generating...' : 'Generate Image'}
                        </button>
                      </div>
                    </div>
                    {(isUploading || isGenerating) && (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Existing User Details Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={userDetails.name}
                  onChange={handleUserDetailChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={userDetails.title}
                  onChange={handleUserDetailChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={userDetails.description}
                  onChange={handleUserDetailChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter a brief description"
                />
              </div>
            </div>
          </div>

          {/* Memory Items Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Memory Items</h2>
              <button
                type="button"
                onClick={addMemoryItem}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {memory.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={e => handleMemoryChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter memory item"
                  />
                  <button
                    type="button"
                    onClick={() => removeMemoryItem(index)}
                    className="p-2 text-red-600 hover:text-red-800 focus:outline-none"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsScreen; 