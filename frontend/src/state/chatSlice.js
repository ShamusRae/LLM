import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Thunk for sending a message
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, sessionId, activeAvatars, selectedFiles, selectedDataFeeds }, { rejectWithValue, getState }) => {
    try {
      // Get current messages for context
      const state = getState();
      const currentMessages = state.chat.messages.filter(msg => 
        !msg.sessionId || msg.sessionId === sessionId
      );
      
      // Prepare conversation context for backend
      const conversationContext = currentMessages.map(msg => ({
        role: msg.metadata?.isUser ? 'user' : 'assistant',
        content: msg.content?.text || '',
        avatarName: msg.metadata?.avatar?.name || 'User',
        timestamp: msg.timestamp
      }));
      
      const response = await axios.post('/api/chat/send', {
        message,
        sessionId,
        activeAvatars,
        selectedFiles,
        selectedDataFeeds,
        conversationContext, // Add context for backend
      });
      
      // Save session after successful message send
      try {
        const sessionData = {
          id: sessionId,
          messages: [
            ...currentMessages,
            // Add the user message
            {
              id: Date.now().toString(),
              content: { text: message },
              metadata: { isUser: true },
              state: { type: 'complete' },
              timestamp: Date.now(),
              sessionId
            }
          ],
          updatedAt: new Date().toISOString()
        };
        
        // Save session asynchronously (don't wait for it)
        axios.post('/api/chat/session', sessionData).catch(console.error);
      } catch (saveError) {
        console.warn('Failed to save session:', saveError);
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Thunk for loading sessions
export const fetchSessions = createAsyncThunk('chat/fetchSessions', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get('/api/chat/sessions');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response.data);
  }
});

const initialState = {
  messages: [],
  sessionId: new Date().getTime().toString(),
  activeAvatars: [],
  selectedFiles: [],
  selectedDataFeeds: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  sessions: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    updateMessage: (state, action) => {
      const index = state.messages.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...action.payload };
      }
    },
    setActiveAvatars: (state, action) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      const seen = new Set();
      state.activeAvatars = incoming.filter((avatar) => {
        const id = avatar?.id;
        if (id === undefined || id === null || seen.has(String(id))) {
          return false;
        }
        seen.add(String(id));
        return true;
      });
    },
    setSelectedFiles: (state, action) => {
      state.selectedFiles = action.payload;
    },
    setSelectedDataFeeds: (state, action) => {
      state.selectedDataFeeds = Array.isArray(action.payload) ? action.payload : [];
    },
    startNewSession: (state) => {
      state.sessionId = new Date().getTime().toString();
      state.messages = [];
      state.selectedFiles = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, action) => {
        state.status = 'loading';
        
        // Add thinking indicators for active avatars immediately
        const { activeAvatars } = action.meta.arg;
        if (activeAvatars && activeAvatars.length > 0) {
          activeAvatars.forEach(avatar => {
            const thinkingMessage = {
              id: `thinking-${Date.now()}-${avatar.id}`,
              content: { 
                text: `Processing your message...` 
              },
              metadata: { 
                isUser: false, 
                isError: false,
                avatar: avatar
              },
              state: { 
                type: 'thinking' 
              },
              timestamp: Date.now(),
              sessionId: action.meta.arg.sessionId,
              isThinking: true
            };
            state.messages.push(thinkingMessage);
          });
        }
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // Remove thinking messages for this session
        state.messages = state.messages.filter(msg => 
          msg.state?.type !== 'thinking' || !msg.isThinking
        );
        
        // Transform API response to match ChatWindow component expectations
        if (action.payload.responses && Array.isArray(action.payload.responses)) {
          const transformedMessages = action.payload.responses.map((apiResponse) => {
            // Find the corresponding avatar
            const activeAvatar = state.activeAvatars.find(avatar => avatar.id == apiResponse.avatarId);
            
            return {
              id: `${Date.now()}-${apiResponse.avatarId}-${Math.random().toString(36).substring(7)}`,
              content: { 
                text: apiResponse.response || "No response content"
              },
              metadata: { 
                isUser: false, 
                isError: apiResponse.error || false,
                debug: apiResponse.debug || null,
                avatar: activeAvatar || {
                  id: apiResponse.avatarId,
                  name: apiResponse.avatarName || "Unknown Avatar",
                  role: "Assistant"
                }
              },
              state: { 
                type: 'complete'
              },
              timestamp: Date.now(),
              provider: apiResponse.provider,
              model: apiResponse.model,
              round: apiResponse.round,
              sessionId: action.meta.arg.sessionId
            };
          });
          
          state.messages.push(...transformedMessages);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        
        // Remove thinking messages on error
        state.messages = state.messages.filter(msg => 
          msg.state?.type !== 'thinking' || !msg.isThinking
        );
        
        console.error('Chat send failed:', action.payload);
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
          state.sessions = action.payload;
      });
  },
});

export const { 
  addMessage, 
  updateMessage, 
  setActiveAvatars, 
  setSelectedFiles,
  setSelectedDataFeeds,
  startNewSession 
} = chatSlice.actions;

export default chatSlice.reducer; 