const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/file.controller');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../storage/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// File routes
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/list', fileController.listFiles);
router.delete('/:fileId', fileController.deleteFile);

module.exports = router; 