import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ModelStatusBox = () => {
  const [status, setStatus] = useState({
    connectivity: 'checking',
    services: {},
    whatsapp: { enabled: false, connected: false, mode: 'webhook' },
    workflow: { supportedModes: [], lastRun: null },
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
      const [whatsappResponse, workflowResponse] = await Promise.allSettled([
        axios.get('/api/whatsapp/status'),
        axios.get('/api/consulting/workflow-diagnostics')
      ]);
      
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
        whatsapp: whatsappResponse.status === 'fulfilled'
          ? (whatsappResponse.value.data?.status || {})
          : { enabled: false, connected: false, mode: 'unavailable' },
        workflow: workflowResponse.status === 'fulfilled'
          ? (workflowResponse.value.data?.diagnostics || { supportedModes: [], lastRun: null })
          : { supportedModes: [], lastRun: null },
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
    <div className="rovesg-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="font-medium text-sm text-[var(--rovesg-text)]">{getStatusText()}</span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-[var(--rovesg-text-muted)]">
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <div className="text-xs space-y-1 text-[var(--rovesg-text)]">
        <div className="font-medium text-[var(--rovesg-text-muted)]">Current Models:</div>
        {Object.entries(status.modelMappings).map(([category, model]) => (
          <div key={category} className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>{getCategoryIcon(category)}</span>
              <span>{category}</span>
            </span>
            <span className="text-[var(--rovesg-primary)] font-mono text-xs">{model}</span>
          </div>
        ))}
      </div>
      
      {/* Service details */}
      {status.services && (
        <div className="text-xs text-[var(--rovesg-text-muted)] mt-2 pt-2 border-t border-[var(--rovesg-border)]">
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

      <div className="text-xs text-[var(--rovesg-text-muted)] mt-2 pt-2 border-t border-[var(--rovesg-border)]">
        <div className="font-medium text-[var(--rovesg-text)] mb-1">Channel + Workflow:</div>
        <div className="flex items-center justify-between">
          <span>WhatsApp</span>
          <span className="font-mono text-[var(--rovesg-primary)]">
            {status.whatsapp?.enabled ? (status.whatsapp?.connected ? 'connected' : 'enabled') : 'disabled'}
            {' '}
            ({status.whatsapp?.mode || 'n/a'})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Workflow modes</span>
          <span className="font-mono text-[var(--rovesg-primary)]">{(status.workflow?.supportedModes || []).join(', ') || 'n/a'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Last stage</span>
          <span className="font-mono text-[var(--rovesg-primary)]">{status.workflow?.lastRun?.finalStage || 'n/a'}</span>
        </div>
      </div>
    </div>
  );
};

export default ModelStatusBox; 