import React, { useState, useEffect } from 'react';

/**
 * Component to allow users to select which MCP data feeds to enable
 */
const DataFeedsSelector = ({ onSelectionChange, initialSelection = [] }) => {
  // Available MCP data feeds
  const availableFeeds = [
    { 
      id: 'google-maps-search', 
      name: 'Google Maps', 
      description: 'Search for locations, get information about places, or find directions',
      icon: '🗺️'
    },
    { 
      id: 'google-weather', 
      name: 'Google Weather', 
      description: 'Get current weather and forecasts for locations worldwide',
      icon: '🌦️'
    },
    { 
      id: 'sec-filings', 
      name: 'SEC Filings', 
      description: 'Search for SEC filings like 10-K, 10-Q, and 8-K reports',
      icon: '📊'
    },
    { 
      id: 'companies-house', 
      name: 'Companies House', 
      description: 'Look up UK company information and filing history',
      icon: '🏢'
    }
  ];

  // State to track selected feeds
  const [selectedFeeds, setSelectedFeeds] = useState(initialSelection.length > 0 ? initialSelection : availableFeeds.map(feed => feed.id));

  // Update parent component when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedFeeds);
    }
  }, [selectedFeeds, onSelectionChange]);

  // Toggle a feed selection
  const toggleFeed = (feedId) => {
    setSelectedFeeds(prev => {
      if (prev.includes(feedId)) {
        return prev.filter(id => id !== feedId);
      } else {
        return [...prev, feedId];
      }
    });
  };

  // Select or deselect all feeds
  const toggleAll = (selectAll) => {
    if (selectAll) {
      setSelectedFeeds(availableFeeds.map(feed => feed.id));
    } else {
      setSelectedFeeds([]);
    }
  };

  return (
    <div className="data-feeds-selector border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Data Feeds</h2>
        <div className="space-x-2">
          <button
            onClick={() => toggleAll(true)}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Select All
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {availableFeeds.map(feed => (
          <div 
            key={feed.id}
            className={`p-3 border rounded cursor-pointer transition-colors ${
              selectedFeeds.includes(feed.id)
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => toggleFeed(feed.id)}
          >
            <div className="flex items-center">
              <div className="mr-2 text-xl">{feed.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{feed.name}</span>
                  <input
                    type="checkbox"
                    checked={selectedFeeds.includes(feed.id)}
                    onChange={() => toggleFeed(feed.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <p className="text-sm text-gray-500">{feed.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Selected feeds will be available to the AI. Deselect feeds you don't want to use.</p>
      </div>

      <style jsx>{`
        .data-feeds-selector {
          max-width: 600px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default DataFeedsSelector; 