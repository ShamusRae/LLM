// File-based Team model (no MongoDB dependency)
const { v4: uuidv4 } = require('uuid');

// Simple Team class for validation and structure
class Team {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.description = data.description || '';
    this.imageUrl = data.imageUrl || null;
    this.imagePrompt = data.imagePrompt || '';
    this.objective = data.objective;
    this.context = data.context || '';
    this.files = data.files || [];
    this.members = data.members || [];
    this.plan = data.plan || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Validate team data
  static validate(teamData) {
    if (!teamData.name) {
      throw new Error('Team name is required');
    }
    if (!teamData.objective) {
      throw new Error('Team objective is required');
    }
    return true;
  }
}

module.exports = Team; 