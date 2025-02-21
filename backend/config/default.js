const path = require('path');

module.exports = {
  llmHealthEndpoint: '/health',
  uploadsDir: path.join(__dirname, '../../uploads'),
  sessionsDir: path.join(__dirname, '../../storage/sessions'),
  memoryFile: path.join(__dirname, '../../storage/memory.json')
}; 