const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const config = require('../config/default');

// Path to settings file and avatars directory
const settingsPath = path.join(__dirname, '../../storage/settings.json');
const avatarsDir = path.join(__dirname, '../../storage/avatars');

// Initialize settings file if it doesn't exist
const initializeSettings = async () => {
  try {
    // Create avatars directory if it doesn't exist
    await fs.mkdir(avatarsDir, { recursive: true });

    // Check if settings file exists
    await fs.access(settingsPath);
  } catch (error) {
    // File doesn't exist, create it with default settings
    const defaultSettings = {
      defaultLLM: '',
      fileClassificationModel: '',
      userDetails: {
        name: '',
        title: '',
        description: '',
        imageUrl: null
      },
      memory: [],
      avatars: [
        {
          id: 1,
          name: 'Main Avatar',
          role: 'Professor',
          description: 'An experienced AI researcher',
          skills: ['Machine Learning', 'Natural Language Processing'],
          imagePrompt: 'A professional looking professor with glasses and a warm smile',
          imageUrl: null,
          selectedModel: 'openai:gpt-4-turbo-preview'
        }
      ]
    };
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
};

// Get settings
exports.getSettings = async (req, res) => {
  try {
    await initializeSettings();
    const settings = await fs.readFile(settingsPath, 'utf8');
    res.json(JSON.parse(settings));
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    await initializeSettings();
    
    // Read existing settings
    const existingSettings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    
    // Merge new settings with existing settings, preserving arrays like avatars
    const newSettings = {
      ...existingSettings,
      ...req.body,
      // Preserve arrays if they exist in current settings but not in new settings
      avatars: req.body.avatars || existingSettings.avatars || [],
      memory: req.body.memory || existingSettings.memory || []
    };
    
    // Write to temporary file first
    const tempPath = settingsPath + '.temp';
    await fs.writeFile(tempPath, JSON.stringify(newSettings, null, 2));
    
    // Verify the temporary file was written correctly
    try {
      const verifyContent = await fs.readFile(tempPath, 'utf8');
      const parsed = JSON.parse(verifyContent);
      
      // Specifically verify avatars were saved correctly
      if (!parsed.avatars || !Array.isArray(parsed.avatars)) {
        throw new Error('Avatar data missing or invalid in temp file');
      }
      
      if (req.body.avatars && req.body.avatars.length !== parsed.avatars.length) {
        throw new Error(`Avatar count mismatch: expected ${req.body.avatars.length}, got ${parsed.avatars.length}`);
      }
    } catch (verifyError) {
      console.error('Verification failed:', verifyError);
      throw new Error(`Failed to verify settings: ${verifyError.message}`);
    }
    
    // Replace the original file with the temporary one
    await fs.rename(tempPath, settingsPath);
    
    // Confirm the settings were saved properly
    const finalSettings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    
    res.json({ 
      message: 'Settings updated successfully',
      avatarCount: finalSettings.avatars ? finalSettings.avatars.length : 0
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      error: 'Failed to update settings',
      message: error.message
    });
  }
};

// Save avatar image
exports.saveAvatar = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Create avatars directory if it doesn't exist
    try {
      await fs.mkdir(avatarsDir, { recursive: true });
    } catch (mkdirError) {
      console.error('Error creating avatars directory:', mkdirError);
      throw new Error(`Failed to create avatars directory: ${mkdirError.message}`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `avatar_${timestamp}.png`;
    const filePath = path.join(avatarsDir, filename);

    console.log('Downloading image from:', imageUrl);
    console.log('Saving to:', filePath);

    try {
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/png, image/jpeg, image/webp'
        },
        maxRedirects: 5,
        timeout: 30000 // 30 second timeout
      });

      // Ensure we received image data
      if (!response.data || response.data.length === 0) {
        throw new Error('Received empty image data');
      }

      // Save the image to disk
      await fs.writeFile(filePath, response.data);

      // Verify the file was saved and is not empty
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        await fs.unlink(filePath); // Clean up empty file
        throw new Error('Failed to save image: file is empty');
      }

      // Return the local URL for the saved image
      const localUrl = `/avatars/${filename}`;
      console.log('Successfully saved image, returning URL:', localUrl);
      res.json({ imageUrl: localUrl });
    } catch (downloadError) {
      console.error('Error downloading or saving image:', downloadError);
      // Clean up any partially written file
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up failed download:', unlinkError);
      }
      throw new Error(`Failed to download or save image: ${downloadError.message}`);
    }
  } catch (error) {
    console.error('Error saving avatar:', error);
    res.status(500).json({ 
      error: 'Failed to save avatar',
      details: error.message
    });
  }
};

// Delete avatar
exports.deleteAvatar = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Read current settings
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    
    // Find avatar
    const avatar = settings.avatars.find(a => a.id === parseInt(id));
    if (!avatar) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    // Delete image file if it exists
    if (avatar.imageUrl) {
      const filename = path.basename(avatar.imageUrl);
      const filePath = path.join(avatarsDir, filename);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Error deleting avatar file:', error);
      }
    }

    // Remove avatar from settings
    settings.avatars = settings.avatars.filter(a => a.id !== parseInt(id));
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    res.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
};

// Add new function to handle user image upload
async function saveUserImage(req, res) {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Create avatars directory if it doesn't exist (we'll store user images here too)
    try {
      await fs.mkdir(avatarsDir, { recursive: true });
    } catch (mkdirError) {
      console.error('Error creating avatars directory:', mkdirError);
      throw new Error(`Failed to create avatars directory: ${mkdirError.message}`);
    }

    // Generate unique filename for user image
    const timestamp = Date.now();
    const filename = `user_${timestamp}.png`;
    const filePath = path.join(avatarsDir, filename);

    try {
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/png, image/jpeg, image/webp'
        },
        maxRedirects: 5,
        timeout: 30000
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Received empty image data');
      }

      // Save the image to disk
      await fs.writeFile(filePath, response.data);

      // Verify the file was saved
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        await fs.unlink(filePath);
        throw new Error('Failed to save image: file is empty');
      }

      // Update settings with new user image URL
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
      settings.userDetails = {
        ...settings.userDetails,
        imageUrl: `/avatars/${filename}`
      };
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

      // Return the local URL for the saved image
      res.json({ imageUrl: `/avatars/${filename}` });
    } catch (downloadError) {
      console.error('Error downloading or saving image:', downloadError);
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up failed download:', unlinkError);
      }
      throw new Error(`Failed to download or save image: ${downloadError.message}`);
    }
  } catch (error) {
    console.error('Error saving user image:', error);
    res.status(500).json({ 
      error: 'Failed to save user image',
      details: error.message
    });
  }
}

// Handle file upload
exports.handleFileUpload = async (req, res) => {
  console.log('File upload request received:', {
    file: req.file,
    body: req.body
  });

  try {
    if (!req.file) {
      console.error('No file received in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });

    // Read current settings
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    console.log('Current settings loaded');

    // Update user image URL
    const imageUrl = `/avatars/${req.file.filename}`;
    settings.userDetails = {
      ...settings.userDetails,
      imageUrl
    };

    // Save updated settings
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    console.log('Settings updated with new image URL:', imageUrl);

    // Verify file exists and is readable
    await fs.access(req.file.path, fs.constants.R_OK);
    const stats = await fs.stat(req.file.path);
    console.log('File verification:', {
      exists: true,
      size: stats.size,
      path: req.file.path
    });

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ 
      error: 'Failed to handle file upload',
      details: error.message
    });
  }
};

module.exports = {
  initializeSettings,
  getSettings: exports.getSettings,
  updateSettings: exports.updateSettings,
  saveAvatar: exports.saveAvatar,
  deleteAvatar: exports.deleteAvatar,
  saveUserImage,
  handleFileUpload: exports.handleFileUpload
}; 