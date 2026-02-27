import React, { useState } from 'react';
import AvatarList from './AvatarList';
import TeamList from './TeamList';
import ModelStatusBox from './ModelStatusBox';

/**
 * Component that provides a tabbed interface for Avatars and Teams.
 */
const AvatarTeamTabs = ({ onAvatarToggle, activeAvatars, onTeamSelect }) => {
  const [activeTab, setActiveTab] = useState('avatars'); // 'avatars' or 'teams'

  return (
    <div className="rovesg-card rounded-2xl backdrop-blur flex flex-col h-full">
      {/* Tab headers */}
      <div className="flex border-b border-[var(--rovesg-border)] bg-[var(--rovesg-surface)]/95 rounded-t-2xl">
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'avatars'
              ? 'text-[var(--rovesg-primary)] border-b-4 border-[var(--rovesg-accent)] font-bold'
              : 'text-[var(--rovesg-text-muted)] hover:text-[var(--rovesg-text)]'
          }`}
          onClick={() => setActiveTab('avatars')}
        >
          Avatars
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'teams'
              ? 'text-[var(--rovesg-primary)] border-b-4 border-[var(--rovesg-accent)] font-bold'
              : 'text-[var(--rovesg-text-muted)] hover:text-[var(--rovesg-text)]'
          }`}
          onClick={() => setActiveTab('teams')}
        >
          Teams
        </button>
      </div>

      {/* Tab content - With more space for avatars */}
      <div className="flex-1 overflow-hidden h-[calc(100vh-240px)] min-h-[400px]">
        {activeTab === 'avatars' && (
          <div className="h-full overflow-y-auto">
            <AvatarList 
              onAvatarToggle={onAvatarToggle} 
              activeAvatars={activeAvatars} 
            />
          </div>
        )}
        {activeTab === 'teams' && (
          <div className="h-full overflow-y-auto">
            <TeamList 
              onTeamSelect={onTeamSelect} 
            />
          </div>
        )}
      </div>
      
      {/* Status box moved below tabs for more avatar space */}
      <div className="flex-shrink-0 p-2 border-t border-[var(--rovesg-border)] bg-[var(--rovesg-surface)]/95 rounded-b-2xl">
        <ModelStatusBox />
      </div>
    </div>
  );
};

export default AvatarTeamTabs; 