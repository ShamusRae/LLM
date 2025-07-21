import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const APIKeySettings = ({ isOpen, onClose }) => {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    claude: '',
  });
  const [serviceHealth, setServiceHealth] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchServiceHealth();
    }
  }, [isOpen]);

  const fetchServiceHealth = async () => {
    try {
      const response = await fetch('/api/settings/health');
      const health = await response.json();
      setServiceHealth(health);
    } catch (error) {
      console.error('Error fetching service health:', error);
    }
  };

  const updateApiKey = async (provider, apiKey) => {
    if (!apiKey.trim()) {
      setMessage(`Please enter a valid ${provider.toUpperCase()} API key`);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, apiKey }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${provider.toUpperCase()} API key updated successfully!`);
        // Clear the input after successful update
        setApiKeys(prev => ({ ...prev, [provider]: '' }));
        // Refresh service health
        await fetchServiceHealth();
      } else {
        setMessage(`❌ Error: ${result.error || result.message}`);
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      setMessage(`❌ Failed to update ${provider.toUpperCase()} API key`);
    } finally {
      setLoading(false);
    }
  };

  const getServiceStatusIcon = (service) => {
    if (!serviceHealth.services) return '⚪';
    
    const status = serviceHealth.services[service];
    if (!status) return '⚪';
    
    if (status.available) return '✅';
    if (service === 'ollama') return status.status === 'offline' ? '🔴' : '⚪';
    return '🔑'; // API key required
  };

  const getServiceStatusText = (service) => {
    if (!serviceHealth.services) return 'Unknown';
    
    const status = serviceHealth.services[service];
    if (!status) return 'Unknown';
    
    if (status.available) {
      return `Available (${status.models} models)`;
    }
    
    if (service === 'ollama') {
      return status.status === 'offline' ? 'Offline - Start Ollama for local AI' : 'Checking...';
    }
    
    return 'API key required';
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Service Configuration">
      <div className="space-y-6">
        {/* Service Status Overview */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Service Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                {getServiceStatusIcon('openai')} <strong className="ml-2">OpenAI</strong>
              </span>
              <span className="text-sm text-gray-600">
                {getServiceStatusText('openai')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                {getServiceStatusIcon('claude')} <strong className="ml-2">Claude</strong>
              </span>
              <span className="text-sm text-gray-600">
                {getServiceStatusText('claude')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                {getServiceStatusIcon('ollama')} <strong className="ml-2">Ollama (Local)</strong>
              </span>
              <span className="text-sm text-gray-600">
                {getServiceStatusText('ollama')}
              </span>
            </div>
          </div>
        </div>

        {/* API Key Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configure API Keys</h3>
          
          {/* OpenAI API Key */}
          <div>
            <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <div className="flex space-x-2">
              <input
                id="openai-key"
                type="password"
                placeholder="sk-proj-..."
                value={apiKeys.openai}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => updateApiKey('openai', apiKeys.openai)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>

          {/* Claude API Key */}
          <div>
            <label htmlFor="claude-key" className="block text-sm font-medium text-gray-700 mb-1">
              Claude API Key
            </label>
            <div className="flex space-x-2">
              <input
                id="claude-key"
                type="password"
                placeholder="sk-ant-..."
                value={apiKeys.claude}
                onChange={(e) => setApiKeys(prev => ({ ...prev, claude: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => updateApiKey('claude', apiKeys.claude)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Ollama Information */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-md font-semibold text-blue-800 mb-2">
            🤖 Local AI with Ollama
          </h4>
          <p className="text-sm text-blue-700 mb-2">
            Ollama provides free, private AI models that run on your computer. No API keys needed!
          </p>
          {serviceHealth.services?.ollama?.available ? (
            <p className="text-sm text-green-700">
              ✅ Ollama is running with {serviceHealth.services.ollama.models} models available
            </p>
          ) : (
            <div className="text-sm text-blue-700">
              <p>To use Ollama:</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="underline">ollama.com</a></li>
                <li>Run: <code className="bg-gray-200 px-1 rounded">ollama serve</code></li>
                <li>Install models: <code className="bg-gray-200 px-1 rounded">ollama pull llama3.2</code></li>
              </ol>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {serviceHealth.recommendations && serviceHealth.recommendations.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-yellow-800 mb-2">💡 Recommendations</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {serviceHealth.recommendations.map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={fetchServiceHealth}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            🔄 Refresh Status
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default APIKeySettings; 