import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sendMessage, addMessage, startNewSession, fetchSessions, setActiveAvatars, setSelectedFiles } from '../state/chatSlice';
import ChatWindow from '../components/ChatWindow';
import SidebarTabs from '../components/SidebarTabs';
import AvatarTeamTabs from '../components/AvatarTeamTabs';
import SessionHistory from '../components/SessionHistory';

const ChatPage = () => {
  const dispatch = useDispatch();
  const { messages, sessionId, activeAvatars, selectedFiles } = useSelector((state) => state.chat);

  useEffect(() => {
    dispatch(fetchSessions());
  }, [dispatch]);

  const handleSendMessage = (messageText) => {
    // Check if we have active avatars
    if (!activeAvatars || activeAvatars.length === 0) {
      alert('Please select at least one avatar to chat with from the Avatars tab on the left!');
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      content: { text: messageText },
      metadata: { isUser: true },
      state: { type: 'complete' }
    };
    dispatch(addMessage(userMessage));
    dispatch(sendMessage({ message: messageText, sessionId, activeAvatars, selectedFiles }));
  };

  const handleNewChat = () => {
    dispatch(startNewSession());
  };

  const handleAvatarToggle = React.useCallback((newActiveAvatars) => {
    dispatch(setActiveAvatars(newActiveAvatars));
  }, [dispatch]);

  const handleSelectedFilesChange = React.useCallback((newSelectedFiles) => {
    dispatch(setSelectedFiles(newSelectedFiles));
  }, [dispatch]);

  const handleSelectedDataFeedsChange = React.useCallback((newDataFeeds) => {
    // Handle data feeds if needed
    console.log('Data feeds changed:', newDataFeeds);
  }, []);

  const handleTeamSelect = React.useCallback((team) => {
    // Handle team selection
    console.log('Team selected:', team);
  }, []);
  
  return (
    <div className="min-h-screen bg-[#f7f7f6] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
          {/* Left Sidebar - Avatars and Teams only */}
          <div className="col-span-3">
            <AvatarTeamTabs 
              onAvatarToggle={handleAvatarToggle}
              activeAvatars={activeAvatars || []}
              onTeamSelect={handleTeamSelect}
            />
          </div>
          
          {/* Main Chat Area */}
          <div className="col-span-6">
            <div className="bg-white rounded-lg border shadow-sm h-full flex flex-col">
              {/* Chat Header */}
              <div className="border-b p-4 bg-[#2d3c59] text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold">Chat Interface</h1>
                  <div className="flex items-center space-x-2 text-sm">
                    <span>Active Avatars: {activeAvatars?.length || 0}</span>
                    <button 
                      onClick={handleNewChat}
                      className="px-3 py-1 bg-[#7dd2d3] text-[#2d3c59] rounded hover:bg-opacity-80 transition-colors"
                    >
                      New Chat
                    </button>
                  </div>
                </div>
                {activeAvatars?.length === 0 && (
                  <div className="mt-2 text-yellow-200 text-sm">
                    👈 Select avatars from the left panel to start chatting!
                  </div>
                )}
              </div>
              
              {/* Chat Window */}
              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  messages={messages}
                  sessionId={sessionId}
                  onSendMessage={handleSendMessage}
                />
              </div>
            </div>
          </div>
          
          {/* Right Sidebar - Files, Data Feeds, and Session History */}
          <div className="col-span-3 space-y-4">
            <div className="h-1/2">
              <SidebarTabs 
                onSelectedFilesChange={handleSelectedFilesChange}
                onSelectedDataFeedsChange={handleSelectedDataFeedsChange}
              />
            </div>
            <div className="h-1/2">
              <SessionHistory 
                onSessionLoad={(session) => { /* Handle session loading */ }} 
                sessionId={sessionId} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 