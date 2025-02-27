import React from 'react';

/**
 * Component that displays when an avatar is using an external tool via MCP
 */
const MCPToolUsage = ({ toolName, isLoading }) => {
  // Determine the icon and description based on tool name
  let icon = null;
  let description = '';
  
  switch (toolName) {
    case 'google-maps-search':
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
        </svg>
      );
      description = 'Searching maps';
      break;
      
    case 'google-weather':
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 5.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0" />
          <path d="M11 5a.25.25 0 1 1-.5 0 .25.25 0 0 1 .5 0" />
          <path d="M13 5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0" />
          <path d="M15.5 5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0" />
          <path d="M19 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
          <path d="M3 8a2 2 0 0 1 3.995.15L7 8.5v2a4.5 4.5 0 1 0 8.816 1.354 1.5 1.5 0 0 0 .03-2.857 2.5 2.5 0 0 0-4.831 0L10.5 9c0 .148-.01.295-.032.44" />
          <path d="M15 18H9" />
        </svg>
      );
      description = 'Checking weather';
      break;
      
    case 'sec-filings':
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      );
      description = 'Searching SEC filings';
      break;
      
    case 'companies-house':
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M3 7v14" />
          <path d="M21 7v14" />
          <path d="M7 7h10" />
          <path d="M7 11h10" />
          <path d="M7 15h10" />
          <rect x="4" y="3" width="16" height="4" rx="1" />
        </svg>
      );
      description = 'Searching Companies House';
      break;
      
    default:
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
      description = 'Using external tools';
  }
  
  return (
    <div className="mcp-tool-usage flex items-center gap-2 text-sm text-gray-500 py-1 px-2 bg-gray-100 rounded-md">
      <div className="flex items-center justify-center text-blue-600">
        {icon}
      </div>
      
      <span className="tool-description">
        {description}
        {isLoading ? '...' : ' complete'}
      </span>
      
      {isLoading && (
        <div className="flex-shrink-0 ml-1">
          <div className="loading-indicator w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      )}
      
      <style jsx>{`
        .mcp-tool-usage {
          display: inline-flex;
          border: 1px solid #e2e8f0;
        }
        
        .loading-indicator {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
};

export default MCPToolUsage; 