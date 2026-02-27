import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sendMessage, addMessage, startNewSession, fetchSessions, setActiveAvatars, setSelectedFiles, setSelectedDataFeeds } from '../state/chatSlice';
import ChatWindow from '../components/ChatWindow';
import SidebarTabs from '../components/SidebarTabs';
import AvatarTeamTabs from '../components/AvatarTeamTabs';
import SessionHistory from '../components/SessionHistory';

const ChatPage = () => {
  const dispatch = useDispatch();
  const { messages, sessionId, activeAvatars, selectedFiles, selectedDataFeeds } = useSelector((state) => state.chat);

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
    dispatch(sendMessage({ message: messageText, sessionId, activeAvatars, selectedFiles, selectedDataFeeds }));
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
    dispatch(setSelectedDataFeeds(newDataFeeds));
  }, [dispatch]);

  const handleTeamSelect = React.useCallback((team) => {
    // Handle team selection
    console.log('Team selected:', team);
  }, []);
  
  return (
    <div className="min-h-screen p-3 lg:p-4">
      <div className="max-w-[80rem] mx-auto space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-3 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/rovesg-logo.png"
                alt="Rovesg"
                className="h-10 w-10 rounded-lg object-contain bg-slate-900 p-1"
              />
              <div>
                <h1 className="text-lg lg:text-xl font-semibold text-slate-900">Rovesg Family Office</h1>
                <p className="text-xs lg:text-sm text-slate-600">Multi-agent research and execution console</p>
              </div>
            </div>
            <button
              onClick={handleNewChat}
              className="px-3 py-1.5 bg-[#d38c55] text-white rounded-lg hover:bg-[#c8712d] transition-colors shadow-sm"
            >
              New Chat
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-11rem)]">
          {/* Left Sidebar - Avatars and Teams only */}
          <div className="lg:col-span-3 h-[26rem] lg:h-auto">
            <AvatarTeamTabs 
              onAvatarToggle={handleAvatarToggle}
              activeAvatars={activeAvatars || []}
              onTeamSelect={handleTeamSelect}
            />
          </div>
          
          {/* Main Chat Area */}
          <div className="lg:col-span-6 min-h-[28rem] lg:min-h-0">
            <div className="bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-lg h-full flex flex-col">
              {/* Chat Header */}
              <div className="border-b p-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Research Chat</h2>
                  <div className="flex items-center space-x-2 text-sm">
                    <span>Active Avatars: {activeAvatars?.length || 0}</span>
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
                  selectedDataFeeds={selectedDataFeeds}
                  activeAvatars={activeAvatars || []}
                  onSendMessage={handleSendMessage}
                />
              </div>
            </div>
          </div>
          
          {/* Right Sidebar - Files, Data Feeds, and Session History */}
          <div className="lg:col-span-3 space-y-4 h-[28rem] lg:h-auto">
            <div className="h-1/2 min-h-[12rem]">
              <SidebarTabs 
                onSelectedFilesChange={handleSelectedFilesChange}
                onSelectedDataFeedsChange={handleSelectedDataFeedsChange}
                initialDataFeeds={selectedDataFeeds}
              />
            </div>
            <div className="h-1/2 min-h-[12rem]">
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