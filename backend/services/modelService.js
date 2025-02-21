const axios = require('axios');
const { Ollama } = require('ollama');

// Initialize Ollama client
const ollama = new Ollama({
  host: 'http://127.0.0.1:11434'
});

exports.discoverAvailableModels = async () => {
  const models = {
    ollama: [],
    openai: [],
    claude: []
  };

  // First check Ollama availability as it's local
  try {
    console.log('Attempting to list Ollama models...');
    // Use direct fetch for listing models as the library's list method might not be reliable
    const ollamaResponse = await fetch('http://127.0.0.1:11434/api/tags');
    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API returned ${ollamaResponse.status}`);
    }
    const ollamaData = await ollamaResponse.json();
    console.log('Ollama models response:', ollamaData);
    
    if (Array.isArray(ollamaData.models)) {
      models.ollama = ollamaData.models.map(model => ({
        id: model.name,
        name: model.name,
        object: 'model',
        created: Date.now(),
        owned_by: 'ollama'
      }));
    }
  } catch (error) {
    console.error('Error fetching Ollama models:', error.message);
    // Don't throw here, just continue with empty Ollama models
  }

  // Only try OpenAI if we have a valid API key
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
      const openaiResponse = await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 5000
      });
      
      // Filter and map OpenAI models
      const filteredModels = openaiResponse.data.data.filter(model => {
        const modelId = model.id.toLowerCase();
        return modelId.includes('gpt-') || modelId.startsWith('o1-');
      });
      
      models.openai = filteredModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error.message);
    }
  }

  // Get default model (prefer Ollama if available since it's local)
  const defaultModel = models.ollama.length > 0 
    ? { provider: 'ollama', id: models.ollama[0].id }
    : models.openai.length > 0
      ? { provider: 'openai', id: models.openai[0].id }
      : null;

  return {
    ...models,
    defaultModel
  };
}; 