const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/file.controller');
const path = require('path');
const fs = require('fs');

// Define upload directory using fileService for consistency
const uploadDir = require('../services/fileService').getUploadDirectory();

// Log the upload directory path
console.log(`File routes initialized with upload directory: ${uploadDir}`);
console.log(`Upload directory exists: ${fs.existsSync(uploadDir)}`);

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  console.log(`Creating upload directory: ${uploadDir}`);
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created directory: ${uploadDir} (exists: ${fs.existsSync(uploadDir)})`);
}

// Configure multer for file uploads with better error handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Double-check directory exists before attempting to upload
    if (!fs.existsSync(uploadDir)) {
      return cb(new Error(`Upload directory does not exist: ${uploadDir}`));
    }
    
    // Check write permissions
    try {
      fs.accessSync(uploadDir, fs.constants.W_OK);
    } catch (err) {
      return cb(new Error(`No write permission for upload directory: ${uploadDir}`));
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFilename = uniqueSuffix + path.extname(file.originalname);
    cb(null, safeFilename);
  }
});

// Add error handling to multer
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit for very large dataset files
  },
  fileFilter: (req, file, cb) => {
    // Optional: implement file type filtering here
    cb(null, true);
  }
}).single('file');

// Wrap multer upload in custom middleware to handle errors
const handleUpload = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({ 
        error: 'File upload error', 
        details: err.message,
        code: err.code
      });
    } else if (err) {
      console.error('Unknown error during upload:', err);
      return res.status(500).json({ 
        error: 'File upload failed', 
        details: err.message 
      });
    }
    next();
  });
};

// File routes
router.post('/upload', handleUpload, fileController.uploadFile);
router.post('/upload-from-url', fileController.uploadFileFromUrl);
router.get('/list', fileController.listFiles);
router.delete('/:fileId', fileController.deleteFile);
router.post('/:fileId/process', fileController.processFile);

module.exports = router; 