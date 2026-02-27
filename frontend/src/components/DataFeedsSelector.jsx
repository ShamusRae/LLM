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
    },
    { 
      id: 'yahoo-finance-stock-metric', 
      name: 'Yahoo Finance - Stock Metrics', 
      description: 'Get latest live stock metrics like regularMarketPrice, market cap, and P/E ratio.',
      icon: '📈'
    },
    { 
      id: 'yahoo-finance-historical-data', 
      name: 'Yahoo Finance - Historical Data', 
      description: 'Get historical stock price data for a specific time period',
      icon: '📉'
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
    <div className="h-full flex flex-col">
      <div className="p-4 bg-[var(--rovesg-surface)]/80 border-b border-[var(--rovesg-border)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[var(--rovesg-text)]">Data Feeds</h2>
          <div className="space-x-2">
            <button
              onClick={() => toggleAll(true)}
              className="px-2 py-1 text-xs bg-[var(--rovesg-accent)]/20 text-[var(--rovesg-accent)] rounded border border-[var(--rovesg-accent)]/30 hover:bg-[var(--rovesg-accent)]/30"
            >
              Select All
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="px-2 py-1 text-xs bg-[#182025] text-[var(--rovesg-text-muted)] rounded border border-[var(--rovesg-border)] hover:bg-[#202a31]"
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable feed list */}
      <div className="overflow-y-auto flex-1 p-4 bg-[var(--rovesg-surface)]/70">
        <div className="space-y-2">
          {availableFeeds.map(feed => (
            <div 
              key={feed.id}
              className={`p-3 border rounded cursor-pointer transition-colors ${
                selectedFeeds.includes(feed.id)
                  ? 'border-[var(--rovesg-accent)] bg-[var(--rovesg-secondary)]/30'
                  : 'border-[var(--rovesg-border)] bg-[#182025] hover:border-[var(--rovesg-primary)]'
              }`}
              onClick={() => toggleFeed(feed.id)}
            >
              <div className="flex items-center">
                <div className="mr-2 text-xl">{feed.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--rovesg-text)]">{feed.name}</span>
                    <input
                      type="checkbox"
                      checked={selectedFeeds.includes(feed.id)}
                      onChange={() => toggleFeed(feed.id)}
                      className="h-4 w-4 text-[var(--rovesg-primary)] focus:ring-[var(--rovesg-primary)] border-[var(--rovesg-border)] rounded bg-[#121619]"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <p className="text-sm text-[var(--rovesg-text-muted)]">{feed.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-[var(--rovesg-surface)]/85 border-t border-[var(--rovesg-border)] text-xs text-[var(--rovesg-text-muted)]">
        <p>Selected feeds will be available to the AI. Deselect feeds you don't want to use.</p>
      </div>
    </div>
  );
};

export default DataFeedsSelector; 