const fileService = require('../services/fileService');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file provided in the request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Received file upload request:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      exists: fs.existsSync(req.file.path)
    });

    // Simple direct approach - if the file exists at the given path, process it
    if (fs.existsSync(req.file.path)) {
      console.log(`File found at path: ${req.file.path}`);
      
      try {
        // Process the uploaded file
        const fileData = await fileService.processUploadedFile(req.file);
        
        console.log('File successfully processed:', {
          id: fileData.id,
          filename: fileData.filename,
          type: fileData.type || fileData.mimetype,
          size: fileData.size
        });
        
        return res.json({
          success: true,
          file: fileData
        });
      } catch (processError) {
        console.error('Error processing file:', processError);
        return res.status(500).json({ 
          error: 'Failed to process file',
          details: processError.message
        });
      }
    } else {
      // File not found at the specified path
      console.error(`File not found at path: ${req.file.path}`);
      return res.status(404).json({ 
        error: 'Uploaded file not found',
        details: 'The file was received but could not be located on disk',
        path: req.file.path
      });
    }
  } catch (err) {
    console.error('Error in file upload handler:', err);
    
    // Check for specific error types
    let statusCode = 500;
    if (err.code === 'ENOENT') {
      statusCode = 404;
    } else if (err.code === 'EACCES') {
      statusCode = 403;
    }
    
    return res.status(statusCode).json({ 
      error: 'Failed to process file upload',
      details: err.message,
      code: err.code
    });
  }
};

exports.listFiles = async (req, res) => {
  try {
    console.log('Received request to list files');
    
    // Get upload directory
    const uploadDir = fileService.getUploadDirectory();
    const fs = require('fs');
    const path = require('path');
    
    console.log(`Using upload directory: ${uploadDir}`);
    
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating upload directory: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // List files directly from the directory
    let files = [];
    try {
      // Get all files in the directory
      const fileNames = fs.readdirSync(uploadDir);
      console.log(`Found ${fileNames.length} entries in directory`);
      
      // Process only files (not directories)
      files = fileNames
        .filter(fileName => {
          try {
            const filePath = path.join(uploadDir, fileName);
            return fs.statSync(filePath).isFile();
          } catch (err) {
            console.error(`Error processing file ${fileName}:`, err);
            return false;
          }
        })
        .map(fileName => {
          try {
            const filePath = path.join(uploadDir, fileName);
            const stats = fs.statSync(filePath);
            const fileId = path.parse(fileName).name;
            
            // Basic metadata for the file
            return {
              id: fileId,
              filename: fileName,
              originalname: fileName,
              path: filePath,
              size: stats.size,
              type: path.extname(fileName).substring(1).toUpperCase(),
              uploadDate: stats.mtime.toISOString(),
              mimetype: getMimeType(fileName)
            };
          } catch (err) {
            console.error(`Error processing file ${fileName}:`, err);
            return null;
          }
        })
        .filter(Boolean);
      
      console.log(`Successfully processed ${files.length} files`);
    } catch (error) {
      console.error('Error reading directory:', error);
      
      // Return an empty list on error rather than failing
      files = [];
    }
    
    // Return the file list
    res.json({ 
      files,
      directory: uploadDir,
      count: files.length
    });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ 
      error: 'Failed to list files',
      details: err.message,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Helper function to determine MIME type from file extension
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    await fileService.deleteFile(fileId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: err.message 
    });
  }
};

/**
 * Upload a file from a URL
 */
exports.uploadFileFromUrl = async (req, res) => {
  try {
    const { url, fileName, fileType, description } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Processing file from URL: ${url}`);
    
    const fileData = await fileService.processFileFromUrl({
      url,
      fileName,
      fileType,
      description
    });
    
    res.json({
      success: true,
      file: fileData
    });
  } catch (err) {
    console.error('Error processing URL file upload:', err);
    res.status(500).json({ 
      error: 'Failed to process file from URL',
      details: err.message 
    });
  }
};

/**
 * Process an existing file with MarkItDown
 * This converts complex files (PDF, Word, Excel) to markdown or text for better accessibility
 */
exports.processFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { options } = req.body || {};
    
    console.log(`Processing file request for ID: ${fileId}`, { options });
    
    // Get the file info
    const file = fileService.getFileById(fileId);
    if (!file) {
      console.error(`File not found: ${fileId}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    console.log(`Found file to process: ${fileId}`, {
      filename: file.filename,
      originalname: file.originalname,
      type: file.type,
      size: file.size
    });
    
    // Check if file type is supported by MarkItDown
    const supportedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!supportedTypes.includes(file.type)) {
      console.warn(`Unsupported file type for processing: ${file.type}`);
      return res.status(400).json({ 
        error: 'File type not supported for processing',
        supportedTypes,
        providedType: file.type
      });
    }
    
    // Process the file
    console.log(`Starting MarkItDown processing for file: ${fileId}`);
    const processedFile = await fileService.processFileWithMarkItDown(file, options);
    console.log(`Completed MarkItDown processing for file: ${fileId}`, {
      processedId: processedFile.id,
      size: processedFile.size
    });
    
    res.json({
      success: true,
      originalFile: file,
      processedFile
    });
  } catch (err) {
    console.error('Error processing file with MarkItDown:', err);
    res.status(500).json({ 
      error: 'Failed to process file',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}; 