import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ModelStatusBox = () => {
  const [status, setStatus] = useState({
    connectivity: 'checking',
    services: {},
    modelMappings: {
      Strategic: 'Loading...',
      General: 'Loading...',
      Rapid: 'Loading...',
      Tactical: 'Loading...'
    }
  });
  
  const [lastUpdated, setLastUpdated] = useState(null);

  // Function to check connectivity and get current model mappings
  const updateStatus = async () => {
    try {
      // Get health status
      const healthResponse = await axios.get('/api/settings/health');
      const healthData = healthResponse.data;

      // Determine overall connectivity status first
      const onlineServicesAvailable = healthData.services?.openai?.available || healthData.services?.claude?.available;
      const ollamaAvailable = healthData.services?.ollama?.available;
      const shouldPreferLocal = false; // Always prefer online models when available (user requested this)
      
      // Get current model mappings for each category
      const mappings = {};
      
      for (const category of ['Strategic', 'General', 'Rapid', 'Tactical']) {
        try {
          const response = await axios.post('/api/model/resolve-avatar', {
            avatar: { modelCategory: category },
            preferLocal: shouldPreferLocal
          });
          
          if (response.data?.success) {
            const modelId = response.data.resolvedModel;
            // Clean up model name for display
            const displayName = modelId?.includes(':') 
              ? modelId.split(':')[1] || modelId 
              : modelId;
            mappings[category] = displayName || 'Not available';
          } else {
            mappings[category] = 'Not available';
          }
        } catch (err) {
          mappings[category] = 'Error';
        }
      }
      
      let connectivityStatus = 'offline';
      if (onlineServicesAvailable && ollamaAvailable) {
        connectivityStatus = 'online';
      } else if (ollamaAvailable) {
        connectivityStatus = 'offline';
      } else if (onlineServicesAvailable) {
        connectivityStatus = 'online';
      }

      setStatus({
        connectivity: connectivityStatus,
        services: healthData.services || {},
        modelMappings: mappings
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error updating model status:', error);
      setStatus(prev => ({
        ...prev,
        connectivity: 'error',
        modelMappings: {
          Strategic: 'Error',
          General: 'Error', 
          Rapid: 'Error',
          Tactical: 'Error'
        }
      }));
    }
  };

  // Update status on mount and every 30 seconds
  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Also update when visibility changes (e.g., coming back from offline)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const getStatusIcon = () => {
    switch (status.connectivity) {
      case 'online': return '🟢';
      case 'offline': return '🟠'; 
      case 'error': return '🔴';
      case 'checking': return '🟡';
      default: return '⚪';
    }
  };

  const getStatusText = () => {
    switch (status.connectivity) {
      case 'online': return 'Online';
      case 'offline': return 'Offline (Local only)';
      case 'error': return 'Connection Error';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Strategic': return '🧠';
      case 'General': return '⚖️';
      case 'Rapid': return '⚡';
      case 'Tactical': return '🎯';
      default: return '🤖';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="font-medium text-sm">{getStatusText()}</span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <div className="text-xs space-y-1">
        <div className="font-medium text-gray-700">Current Models:</div>
        {Object.entries(status.modelMappings).map(([category, model]) => (
          <div key={category} className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>{getCategoryIcon(category)}</span>
              <span>{category}</span>
            </span>
            <span className="text-[#002466] font-mono text-xs">{model}</span>
          </div>
        ))}
      </div>
      
      {/* Service details */}
      {status.services && (
        <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
          <div className="flex gap-4">
            {status.services.openai?.available && (
              <span>🤖 OpenAI</span>
            )}
            {status.services.claude?.available && (
              <span>🧠 Claude</span>
            )}
            {status.services.ollama?.available && (
              <span>🏠 Ollama ({status.services.ollama.models || 0})</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelStatusBox; 