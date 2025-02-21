const fs = require('fs');
const config = require('../config/default');

exports.updateMemory = async (message) => {
  let memory = [];
  if (fs.existsSync(config.memoryFile)) {
    memory = JSON.parse(fs.readFileSync(config.memoryFile));
  }
  memory.push({ timestamp: new Date(), message });
  fs.writeFileSync(config.memoryFile, JSON.stringify(memory, null, 2));
}; 