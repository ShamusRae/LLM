import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SessionHistory = ({ onSessionSelect }) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    // Fetch session history from backend
    axios.get('/api/chat/sessions')
      .then(res => {
        setSessions(res.data);
      })
      .catch(err => console.error('Error fetching sessions:', err));
  }, []);

  return (
    <div className="border rounded p-4 bg-white">
      <h2 className="font-bold mb-2">Session History</h2>
      <ul>
        {sessions.map(session => (
          <li key={session.id} 
              className="cursor-pointer hover:underline mb-1"
              onClick={() => onSessionSelect(session)}>
            {session.name} - {new Date(session.updatedAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SessionHistory; 