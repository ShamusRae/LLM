import React, { useState, forwardRef, useImperativeHandle } from 'react';
import FileList from './FileList';
import DataFeedsSelector from './DataFeedsSelector';

/**
 * Sidebar component that provides a tabbed interface for Files and Data Feeds
 * Using CLA brand colors from the style guide:
 * - Navy: #2d3c59
 * - Teal: #7dd2d3
 * - Light Cloud: #f7f7f6
 */
const SidebarTabs = forwardRef(({ onSelectedFilesChange, onSelectedDataFeedsChange, initialDataFeeds = [] }, ref) => {
  const [activeTab, setActiveTab] = useState('files'); // 'files' or 'dataFeeds'
  const fileListRef = React.useRef();

  // Expose clearFileSelection method through ref
  useImperativeHandle(ref, () => ({
    clearFileSelection: () => {
      if (fileListRef.current) {
        fileListRef.current.clearSelection();
      }
    }
  }));

  return (
    <div className="border rounded bg-[#f7f7f6] flex flex-col">
      {/* Tab headers */}
      <div className="flex border-b bg-white">
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'files'
              ? 'text-[#2d3c59] border-b-4 border-[#7dd2d3] font-bold'
              : 'text-gray-500 hover:text-[#2d3c59]'
          }`}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'dataFeeds'
              ? 'text-[#2d3c59] border-b-4 border-[#7dd2d3] font-bold'
              : 'text-gray-500 hover:text-[#2d3c59]'
          }`}
          onClick={() => setActiveTab('dataFeeds')}
        >
          Data Feeds
        </button>
      </div>

      {/* Tab content - Now with fixed height and scrollable */}
      <div className="flex-1 overflow-hidden h-[calc(100vh-350px)] min-h-[300px]">
        {activeTab === 'files' && (
          <FileList
            ref={fileListRef}
            onSelectedFilesChange={onSelectedFilesChange}
          />
        )}
        {activeTab === 'dataFeeds' && (
          <DataFeedsSelector
            onSelectionChange={onSelectedDataFeedsChange}
            initialSelection={initialDataFeeds}
          />
        )}
      </div>
    </div>
  );
});

export default SidebarTabs; 