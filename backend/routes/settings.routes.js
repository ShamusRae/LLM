const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const settingsController = require('../controllers/settings.controller');

// Define storage paths
const avatarsDir = path.join(__dirname, '../../storage/avatars');

// Ensure storage directory exists before configuring multer
const ensureStorageExists = async () => {
  try {
    await fs.access(avatarsDir);
  } catch {
    await fs.mkdir(avatarsDir, { recursive: true });
  }
};

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    await ensureStorageExists().catch(console.error);
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'user-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Initialize settings and storage when the router is created
(async () => {
  await ensureStorageExists();
  await settingsController.initializeSettings();
})().catch(console.error);

// Get and update settings
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

// Avatar management
router.post('/avatar', settingsController.saveAvatar);
router.delete('/avatar/:id', settingsController.deleteAvatar);

// User image management
router.post('/user-image', settingsController.saveUserImage);
router.post('/upload-image', upload.single('file'), settingsController.handleFileUpload);

module.exports = router; 