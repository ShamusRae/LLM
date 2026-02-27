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
    <div className="border border-slate-200 rounded-2xl bg-white/90 backdrop-blur flex flex-col shadow-md h-full">
      {/* Tab headers */}
      <div className="flex border-b bg-white/95 rounded-t-2xl">
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'avatars'
              ? 'text-[#002466] border-b-4 border-[#819f3d] font-bold'
              : 'text-gray-500 hover:text-[#002466]'
          }`}
          onClick={() => setActiveTab('avatars')}
        >
          Avatars
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'teams'
              ? 'text-[#002466] border-b-4 border-[#819f3d] font-bold'
              : 'text-gray-500 hover:text-[#002466]'
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
      <div className="flex-shrink-0 p-2 border-t bg-slate-50 rounded-b-2xl">
        <ModelStatusBox />
      </div>
    </div>
  );
};

export default AvatarTeamTabs; 