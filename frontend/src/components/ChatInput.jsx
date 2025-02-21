import React, { useState } from 'react';

const ChatInput = ({ onSendMessage }) => {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="mt-4 flex">
      <input 
        className="flex-1 border rounded p-2" 
        placeholder="Type your message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <button 
        className="ml-2 bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
        onClick={handleSubmit}
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput; 