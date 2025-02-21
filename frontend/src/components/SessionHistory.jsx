import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SessionHistory = ({ onSessionLoad, sessionId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null); // Track which session is being deleted

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/chat/sessions');
      // Sort sessions by updatedAt in descending order
      const sortedSessions = res.data.sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      
      // Process sessions to get titles from first user message
      const processedSessions = sortedSessions.map(session => ({
        ...session,
        title: getSessionTitle(session.messages)
      }));
      
      setSessions(processedSessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [sessionId]);

  const handleDelete = async (e, sessionToDelete) => {
    e.stopPropagation(); // Prevent triggering the session load
    
    try {
      setDeleting(sessionToDelete.id);
      await axios.delete(`/api/chat/session/${sessionToDelete.id}`);
      setSessions(prev => prev.filter(session => session.id !== sessionToDelete.id));
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session');
    } finally {
      setDeleting(null);
    }
  };

  // Get session title from the first user message
  const getSessionTitle = (messages) => {
    if (!messages || messages.length === 0) return 'Empty Session';
    const firstUserMessage = messages.find(m => m.metadata?.isUser);
    if (!firstUserMessage) return 'No user message';
    
    // Truncate message if too long
    const title = firstUserMessage.content.text;
    return title.length > 50 ? title.substring(0, 47) + '...' : title;
  };

  // Format date to be more readable
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString();
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="border rounded p-4 bg-white">
      <h2 className="font-bold mb-4">Chat History</h2>
      
      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading history...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No chat history yet</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sessions.map(session => (
            <div
              key={session.id}
              className="relative group"
            >
              <button
                onClick={() => onSessionLoad(session)}
                className="w-full text-left p-3 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-sm text-gray-900 truncate pr-8">
                  {session.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(session.updatedAt)}
                </div>
              </button>
              <button
                onClick={(e) => handleDelete(e, session)}
                disabled={deleting === session.id}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 
                  hover:text-red-500 transition-colors ${deleting === session.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Delete session"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionHistory; 