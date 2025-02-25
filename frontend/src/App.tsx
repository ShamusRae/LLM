import React, { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import SettingsScreen from './components/SettingsScreen';
import { Message, ChatSession, Avatar } from './types/chat';

interface AppState {
  messages: Message[];
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  selectedAvatar: Avatar | null;
  isSettingsOpen: boolean;
  error: string | null;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    messages: [],
    currentSession: null,
    sessions: [],
    selectedAvatar: null,
    isSettingsOpen: false,
    error: null
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/chat/sessions');
      const sessions = await response.json();
      setState(prev => ({ ...prev, sessions }));
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setState(prev => ({ ...prev, error: 'Failed to load chat sessions' }));
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: { text: message },
      metadata: {
        isUser: true,
        timestamp: new Date().toISOString(),
        complete: true
      },
      state: { type: 'complete' }
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          sessionId: state.currentSession?.id,
          avatarId: state.selectedAvatar?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      let botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: { text: '' },
        metadata: {
          isUser: false,
          avatar: state.selectedAvatar || undefined,
          timestamp: new Date().toISOString(),
          complete: false
        },
        state: { type: 'streaming' }
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, botMessage]
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const update = JSON.parse(line);
            if (update.type === 'thinking') {
              botMessage = {
                ...botMessage,
                content: {
                  ...botMessage.content,
                  thinking: update.content
                }
              };
            } else {
              botMessage = {
                ...botMessage,
                content: {
                  ...botMessage.content,
                  text: (botMessage.content.text || '') + update.content
                }
              };
            }

            if (update.done) {
              botMessage = {
                ...botMessage,
                metadata: { ...botMessage.metadata, complete: true },
                state: { type: 'complete' }
              };
            }

            setState(prev => ({
              ...prev,
              messages: prev.messages.map(msg =>
                msg.id === botMessage.id ? botMessage : msg
              )
            }));
          } catch (error) {
            console.error('Error parsing stream chunk:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === (prev.messages[prev.messages.length - 1]?.id)
            ? {
                ...msg,
                state: {
                  type: 'error',
                  error: 'Failed to send message'
                }
              }
            : msg
        )
      }));
    }
  };

  const handleRetry = async (messageId: string) => {
    const messageToRetry = state.messages.find(msg => msg.id === messageId);
    if (!messageToRetry) return;

    // Find the last user message before this one
    const userMessages = state.messages.filter(msg => msg.metadata.isUser);
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (lastUserMessage) {
      // Remove the failed message and retry
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== messageId)
      }));
      await handleSend(lastUserMessage.content.text || '');
    }
  };

  const toggleSettings = () => {
    setState(prev => ({ ...prev, isSettingsOpen: !prev.isSettingsOpen }));
  };

  const handleAvatarSelect = (avatar: Avatar) => {
    setState(prev => ({ ...prev, selectedAvatar: avatar }));
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
                  <button
                    onClick={toggleSettings}
                    className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Settings
                  </button>
                </div>
                {state.isSettingsOpen ? (
                  <SettingsScreen
                    onClose={toggleSettings}
                    onAvatarSelect={handleAvatarSelect}
                    selectedAvatar={state.selectedAvatar}
                  />
                ) : (
                  <ChatWindow
                    messages={state.messages}
                    onRetry={handleRetry}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 