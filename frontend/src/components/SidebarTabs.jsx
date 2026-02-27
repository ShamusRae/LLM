import React, { useState, forwardRef, useImperativeHandle } from 'react';
import FileList from './FileList';
import DataFeedsSelector from './DataFeedsSelector';

/**
 * Sidebar component that provides a tabbed interface for Files and Data Feeds.
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
    <div className="rovesg-card rounded-2xl backdrop-blur flex flex-col h-full">
      {/* Tab headers */}
      <div className="flex border-b border-[var(--rovesg-border)] bg-[var(--rovesg-surface)]/95 rounded-t-2xl">
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'files'
              ? 'text-[var(--rovesg-primary)] border-b-4 border-[var(--rovesg-accent)] font-bold'
              : 'text-[var(--rovesg-text-muted)] hover:text-[var(--rovesg-text)]'
          }`}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'dataFeeds'
              ? 'text-[var(--rovesg-primary)] border-b-4 border-[var(--rovesg-accent)] font-bold'
              : 'text-[var(--rovesg-text-muted)] hover:text-[var(--rovesg-text)]'
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