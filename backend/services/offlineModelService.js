const axios = require('axios');

/**
 * Service to detect and handle offline/online model availability
 * Ensures the app works gracefully when internet is not available (like on a plane)
 */

class OfflineModelService {
  constructor() {
    this.connectivityStatus = {
      online: true,
      lastChecked: null,
      checkInterval: 30000, // 30 seconds
      apiEndpointsUp: {
        openai: false,
        claude: false,
        ollama: false
      }
    };

    // Start periodic connectivity checks
    this.startConnectivityMonitoring();
  }

  /**
   * Start monitoring connectivity to various AI providers
   */
  startConnectivityMonitoring() {
    setInterval(() => {
      this.checkProviderAvailability();
    }, this.connectivityStatus.checkInterval);

    // Initial check
    this.checkProviderAvailability();
  }

  /**
   * Check which AI providers are currently available
   */
  async checkProviderAvailability() {
    console.log('🌐 Checking AI provider connectivity...');
    
    const results = {
      openai: false,
      claude: false,
      ollama: false
    };

    // Check OpenAI (if API key is available)
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      try {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          timeout: 5000
        });
        results.openai = response.status === 200;
        console.log('✅ OpenAI API accessible');
      } catch (error) {
        console.log('❌ OpenAI API not accessible:', error.message);
        results.openai = false;
      }
    }

    // Check Claude (if API key is available)
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      try {
        // Use a simple ping to Claude API (adjust endpoint as needed)
        const response = await axios.post('https://api.anthropic.com/v1/messages', 
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }]
          },
          {
            headers: { 
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
        results.claude = true;
        console.log('✅ Claude API accessible');
      } catch (error) {
        // Claude might return error but still be accessible
        if (error.response && error.response.status < 500) {
          results.claude = true;
          console.log('✅ Claude API accessible (with expected error)');
        } else {
          console.log('❌ Claude API not accessible:', error.message);
          results.claude = false;
        }
      }
    }

    // Check Ollama (local)
    try {
      const response = await axios.get('http://127.0.0.1:11434/api/tags', {
        timeout: 3000
      });
      results.ollama = response.status === 200 && response.data.models?.length > 0;
      console.log(`✅ Ollama accessible with ${response.data.models?.length || 0} models`);
    } catch (error) {
      console.log('❌ Ollama not accessible:', error.message);
      results.ollama = false;
    }

    // Update connectivity status
    this.connectivityStatus.apiEndpointsUp = results;
    this.connectivityStatus.lastChecked = Date.now();
    this.connectivityStatus.online = Object.values(results).some(Boolean);

    // Log current status
    const status = this.connectivityStatus.online ? 'ONLINE' : 'OFFLINE';
    const availableProviders = Object.entries(results)
      .filter(([_, available]) => available)
      .map(([provider, _]) => provider)
      .join(', ');
    
    console.log(`🌍 Connectivity Status: ${status} | Available: ${availableProviders || 'None'}`);

    return results;
  }

  /**
   * Get current connectivity status
   */
  getConnectivityStatus() {
    return {
      ...this.connectivityStatus,
      isOfflineMode: !this.connectivityStatus.online,
      availableProviders: Object.entries(this.connectivityStatus.apiEndpointsUp)
        .filter(([_, available]) => available)
        .map(([provider, _]) => provider),
      hasLocalModels: this.connectivityStatus.apiEndpointsUp.ollama
    };
  }

  /**
   * Filter categorized models to only show available ones based on connectivity
   */
  filterAvailableModels(categorizedModels) {
    if (!categorizedModels) return null;

    const availability = this.connectivityStatus.apiEndpointsUp;
    const filteredCategories = {};

    Object.entries(categorizedModels).forEach(([category, models]) => {
      filteredCategories[category] = models.filter(model => {
        // If Ollama model and Ollama is available
        if (model.provider === 'ollama' && availability.ollama) {
          return true;
        }
        // If OpenAI model and OpenAI is available  
        if (model.provider === 'openai' && availability.openai) {
          return true;
        }
        // If Claude model and Claude is available
        if (model.provider === 'claude' && availability.claude) {
          return true;
        }
        return false;
      });
    });

    return filteredCategories;
  }

  /**
   * Get the best offline fallback model category based on available local models
   */
  getOfflineFallbackStrategy() {
    if (this.connectivityStatus.apiEndpointsUp.ollama) {
      return {
        strategy: 'local_ollama',
        message: 'Using local Ollama models - full offline capability',
        recommendedCategory: 'Tactical'
      };
    }

    return {
      strategy: 'no_models',
      message: 'No AI models available - please ensure internet connection or start Ollama',
      recommendedCategory: null
    };
  }

  /**
   * Check if we should prefer local models (offline mode or user preference)
   */
  shouldPreferLocal() {
    return !this.connectivityStatus.online || 
           process.env.OFFLINE_MODE === 'true' ||
           process.env.PREFER_LOCAL_MODELS === 'true';
  }

  /**
   * Get offline-safe model recommendations for each category
   */
  getOfflineSafeCategories() {
    const hasLocal = this.connectivityStatus.apiEndpointsUp.ollama;
    const hasOnline = this.connectivityStatus.apiEndpointsUp.openai || this.connectivityStatus.apiEndpointsUp.claude;

    if (!hasLocal && !hasOnline) {
      return {
        Strategic: { available: false, message: 'No models available' },
        General: { available: false, message: 'No models available' },
        Rapid: { available: false, message: 'No models available' },
        Tactical: { available: false, message: 'No models available' }
      };
    }

    if (hasLocal && !hasOnline) {
      // Offline mode - local models available in all categories
      return {
        Strategic: { available: true, message: 'Local models available' },
        General: { available: true, message: 'Local models available' },
        Rapid: { available: true, message: 'Local models available' },
        Tactical: { available: true, message: 'Local models available' }
      };
    }

    // Online mode - all categories available
    return {
      Strategic: { available: true, message: 'Online models available' },
      General: { available: true, message: 'Online models available' },
      Rapid: { available: true, message: 'Online models available' },
      Tactical: { available: true, message: 'Local and online models available' }
    };
  }
}

module.exports = new OfflineModelService(); 