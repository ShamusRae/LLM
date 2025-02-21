import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import AvatarList from './components/AvatarList';
import FileList from './components/FileList';
import SessionHistory from './components/SessionHistory';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import SettingsScreen from './components/SettingsScreen';
import axios from 'axios';

// NewChatButton component
const NewChatButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
    New Chat
  </button>
);

// Message handling utilities
const createMessage = ({
  sessionId,
  round,
  content = '',
  isUser = false,
  avatar = null,
  state = 'complete'
}) => {
  const message = {
    id: Date.now().toString(),
    sessionId,
    round,
    timestamp: new Date().toISOString(),
    content: {
      text: content,
      markdown: !isUser,
      specialContent: []
    },
    metadata: {
      isUser,
      isComplete: state === 'complete',
      isError: state === 'error',
      avatar
    },
    state: {
      type: state,
      streamedContent: ''
    }
  };
  return message;
};

const updateMessageState = (message, update) => {
  if (update.state === 'streaming') {
    // For streaming updates, handle the content
    const newContent = update.content || '';
    
    // If transitioning from thinking to streaming, start fresh
    // Otherwise append the new content to existing streamedContent
    const accumulatedContent = message.state.type === 'thinking' 
      ? newContent 
      : (message.state.streamedContent || '') + newContent;

    return {
      ...message,
      content: {
        ...message.content,
        text: accumulatedContent
      },
      metadata: {
        ...message.metadata,
        isComplete: false
      },
      state: {
        type: 'streaming',
        streamedContent: accumulatedContent
      }
    };
  }
  
  if (update.state === 'complete') {
    const finalContent = update.content || message.state.streamedContent || message.content.text;
    return {
      ...message,
      content: {
        ...message.content,
        text: finalContent
      },
      metadata: {
        ...message.metadata,
        isComplete: true
      },
      state: {
        type: 'complete',
        streamedContent: finalContent
      }
    };
  }
  
  return message;
};

// AppRoutes component
const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fileListRef = useRef(null);
  const [activeAvatars, setActiveAvatars] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(Date.now().toString());
  const [selectedFiles, setSelectedFiles] = useState([]);
  const streamingContent = useRef({});
  const messageStreamingStates = useRef(new Map());

  // Load initial session and avatars
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load settings to get avatars
        const settingsResponse = await axios.get('http://localhost:3001/api/settings');
        if (settingsResponse.data?.avatars) {
          // Set first avatar as active by default
          setActiveAvatars([settingsResponse.data.avatars[0]]);
        }

        // Load most recent session if it exists
        const sessionsResponse = await axios.get('http://localhost:3001/api/chat/sessions');
        if (sessionsResponse.data && sessionsResponse.data.length > 0) {
          // Sort sessions by date and get most recent
          const sortedSessions = sessionsResponse.data.sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
          );
          const mostRecent = sortedSessions[0];
          
          setSessionId(mostRecent.id);
          setMessages(mostRecent.messages || []);
          setActiveAvatars(mostRecent.activeAvatars || [settingsResponse.data.avatars[0]]);
          setSelectedFiles(mostRecent.selectedFiles || []);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const handleAvatarToggle = (updatedAvatars) => {
    setActiveAvatars(updatedAvatars);
  };

  const isStreamingModel = (model) => {
    if (!model) return false;
    const streamingModels = ['o1', 'o3', 'deepseek'];
    return streamingModels.some(m => model.id?.toLowerCase().includes(m));
  };

  const handleMessageUpdate = (messageId, update) => {
    setMessages(prevMessages => {
      const messageIndex = prevMessages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        return prevMessages;
      }
      
      const updatedMessages = [...prevMessages];
      const oldMessage = updatedMessages[messageIndex];
      const newMessage = updateMessageState(oldMessage, update);
      
      updatedMessages[messageIndex] = newMessage;
      return updatedMessages;
    });
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;
    
    // Create and add user message
    const userMessage = createMessage({
      sessionId,
      round: messages.length + 1,
      content: messageText,
      isUser: true
    });
    
    setMessages(prev => [...prev, userMessage]);
    
    if (activeAvatars.length === 0) {
      const errorMessage = createMessage({
        sessionId,
        round: userMessage.round + 1,
        content: "Please activate at least one avatar by clicking on it.",
        state: 'error'
      });
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    try {
      // Get avatar decision first
      const decisionResponse = await fetch('/api/choose-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          activeAvatars,
          chatHistory: messages.map(m => ({
            text: m.content.text,
            isUser: m.metadata.isUser,
            avatarId: m.metadata.avatar?.id,
            round: m.round
          }))
        })
      });
      
      if (!decisionResponse.ok) {
        throw new Error(`Avatar decision failed: ${decisionResponse.status}`);
      }
      
      const decisionData = await decisionResponse.json();
      
      // Add validation for decision data
      if (!decisionData || !decisionData.order || !decisionData.order.length) {
        throw new Error('Invalid avatar decision response');
      }

      const rounds = decisionData.discussionRounds || 1;
      let currentRound = 1;
      let roundResponses = [];

      // Process each round
      while (currentRound <= rounds) {
        // Process each avatar in the order for this round
        for (const avatarId of decisionData.order) {
          // Set up SSE connection for this avatar
          const eventSource = new EventSource(`/api/chat/stream/${sessionId}`);
          let hasStartedStreaming = false;
          let isConnected = false;

          // Convert IDs to strings for comparison
          const selectedAvatar = activeAvatars.find(a => String(a.id) === String(avatarId));
          if (!selectedAvatar) {
            console.error(`Avatar ${avatarId} not found in active avatars, skipping`);
            continue;
          }

          // Wait for connection to be established
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('SSE connection timeout'));
            }, 5000);

            eventSource.onopen = (event) => {
              isConnected = true;
              clearTimeout(timeout);
              resolve();
            };

            eventSource.onerror = (error) => {
              console.error('SSE connection error during setup:', error);
              clearTimeout(timeout);
              reject(new Error('Failed to establish SSE connection'));
            };
          });
          
          // Create initial AI message for this avatar
          const aiMessage = createMessage({
            sessionId,
            round: userMessage.round + currentRound,
            content: `${selectedAvatar.name} is thinking...`,
            avatar: selectedAvatar,
            state: 'thinking'
          });
          
          setMessages(prev => [...prev, aiMessage]);

          // Set up message event handler
          const messageComplete = new Promise((resolve, reject) => {
            eventSource.onmessage = (event) => {
              try {
                let data;
                try {
                  data = JSON.parse(event.data);
                } catch (parseError) {
                  data = { response: event.data };
                }
                
                if (data.ping) return;
                
                if (data.complete) {
                  handleMessageUpdate(aiMessage.id, {
                    state: 'complete',
                    content: data.response
                  });
                  eventSource.close();
                  resolve(data.response);
                  return;
                }
                
                if (data.response) {
                  if (!hasStartedStreaming) {
                    hasStartedStreaming = true;
                  }
                  
                  handleMessageUpdate(aiMessage.id, {
                    state: 'streaming',
                    content: data.response
                  });
                }
              } catch (error) {
                console.error('Error processing SSE message:', error);
                handleMessageUpdate(aiMessage.id, {
                  state: 'error',
                  content: `Error: ${error.message}`
                });
                eventSource.close();
                reject(error);
              }
            };
          });

          // Send chat request for this avatar
          const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: messageText,
              sessionId,
              avatarId: selectedAvatar.id,
              activeAvatars,
              selectedFiles,
              chatHistory: [
                ...messages.map(m => ({
                  text: m.content.text,
                  isUser: m.metadata.isUser,
                  avatarId: m.metadata.avatar?.id,
                  round: m.round
                })),
                ...roundResponses.map(r => ({
                  text: r.content,
                  isUser: false,
                  avatarId: r.avatarId,
                  round: currentRound
                }))
              ],
              isFollowUp: roundResponses.length > 0,
              currentRound
            })
          });

          if (!response.ok) {
            throw new Error(`Chat request failed for ${selectedAvatar.name}: ${response.status}`);
          }

          // Wait for the message to complete
          const messageContent = await messageComplete;

          // Store this response for the next avatar
          roundResponses.push({
            content: messageContent,
            avatarId: selectedAvatar.id,
            avatarName: selectedAvatar.name
          });

          // Clean up event source
          eventSource.close();
        }
        currentRound++;
      }

      // After all responses are complete, save the session
      try {
        await saveSession();
      } catch (error) {
        console.error('Error saving session after conversation:', error);
        // Don't throw here - we don't want to interrupt the chat flow if saving fails
      }
      
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMessage = createMessage({
        sessionId,
        round: userMessage.round + 1,
        content: `Error: ${error.message}`,
        state: 'error'
      });
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Save session function
  const saveSession = async () => {
    if (messages.length === 0) return;
    
    try {
      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          messages,
          activeAvatars,
          selectedFiles,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save session');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  };

  // Handle new chat function
  const handleNewChat = async () => {
    try {
      // Save current session if there are messages
      if (messages.length > 0) {
        await saveSession();
      }

      // Generate new session ID and reset state
      const newSessionId = Date.now().toString();
      
      // Update state in a single batch
      setSessionId(newSessionId);
      setMessages([]);
      setActiveAvatars([]);
      setSelectedFiles([]);
      
      // Clear file selection UI
      fileListRef.current?.clearSelection();

      // Force a re-render of the chat window
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    } catch (error) {
      console.error('Error starting new chat:', error);
      // Show error message to user
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: `Error starting new chat: ${error.message}`,
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // Handle session load function
  const handleSessionLoad = async (session) => {
    try {
      // Save current session if there are messages
      if (messages.length > 0) {
        await saveSession();
      }
      
      // Update state in a single batch
      setSessionId(session.id);
      setMessages(session.messages || []);
      setActiveAvatars(session.activeAvatars || []);
      setSelectedFiles(session.selectedFiles || []);

      // Force a re-render of the chat window
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    } catch (error) {
      console.error('Error loading session:', error);
      // Show error message to user
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: `Error loading session: ${error.message}`,
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Left sidebar */}
          <div className="col-span-1">
            <div className="flex flex-col space-y-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm pointer-events-auto">
                <NewChatButton onClick={handleNewChat} />
              </div>
              <div className="bg-white rounded-lg border shadow-sm pointer-events-auto">
                <AvatarList 
                  onAvatarToggle={handleAvatarToggle} 
                  activeAvatars={activeAvatars} 
                />
              </div>
            </div>
          </div>
          
          {/* Main chat area */}
          <div className="col-span-2">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg border shadow-sm">
                <span className="text-sm text-gray-500">
                  Session ID: {sessionId}
                </span>
              </div>
              <div className="flex-grow">
                <ChatWindow 
                  messages={messages} 
                  selectedAvatar={activeAvatars[0]} 
                  sessionId={sessionId}
                />
              </div>
              <div className="mt-4">
                <ChatInput onSendMessage={handleSendMessage} />
              </div>
            </div>
          </div>
          
          {/* Right sidebar */}
          <div className="col-span-1">
            <div className="flex flex-col space-y-4">
              <div className="bg-white rounded-lg border shadow-sm pointer-events-auto">
                <FileList 
                  ref={fileListRef}
                  onSelectedFilesChange={setSelectedFiles} 
                />
              </div>
              <div className="bg-white rounded-lg border shadow-sm pointer-events-auto">
                <SessionHistory 
                  onSessionLoad={handleSessionLoad}
                  sessionId={sessionId}
                  key={sessionId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// App component with routing
const App = () => {
  return (
    <Router>
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <Link to="/" className="text-lg font-semibold text-gray-800">
            LLM Chat
          </Link>
          <Link 
            to="/settings" 
            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
          >
            ⚙️ Settings
          </Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<AppRoutes />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;