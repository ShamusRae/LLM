'use strict';

class BaseProvider {
  constructor(apiKey) {
    if (this.constructor === BaseProvider) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    this.apiKey = apiKey;
  }

  async generateResponse(prompt, options = {}) {
    throw new Error("Method 'generateResponse()' must be implemented.");
  }

  async generateImage(prompt, options = {}) {
    throw new Error("Method 'generateImage()' must be implemented.");
  }
  
  static getAvailableModels() {
    throw new Error("Method 'getAvailableModels()' must be implemented.");
  }
}

module.exports = BaseProvider; 