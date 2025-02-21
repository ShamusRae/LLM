const fileService = require('../services/fileService');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileData = await fileService.processUploadedFile(req.file);
    res.json({
      success: true,
      file: fileData
    });
  } catch (err) {
    console.error('Error processing file upload:', err);
    res.status(500).json({ 
      error: 'Failed to process file upload',
      details: err.message 
    });
  }
};

exports.listFiles = async (req, res) => {
  try {
    const files = fileService.listFiles();
    res.json({ files });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ 
      error: 'Failed to list files',
      details: err.message 
    });
  }
};

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