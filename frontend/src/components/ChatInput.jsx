import React, { useState, useRef } from 'react';

const ChatInput = ({ onSendMessage, selectedAvatar }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    if (!input.trim()) return;
    
    // Special handling for Ada Lovelace for data analysis
    if (selectedAvatar === 'ada-lovelace' && 
        (input.toLowerCase().includes('predict') || 
         input.toLowerCase().includes('model') || 
         input.toLowerCase().includes('analyze') || 
         input.toLowerCase().includes('forecast'))) {
      // The AdaLovelaceAgent component will handle this message
      onSendMessage(input);
      setInput('');
      return;
    }
    
    // Continue with normal message handling
    onSendMessage(input);
    setInput('');
  };
  
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center px-4 py-2 border-t">
      <input
        ref={inputRef}
        className="flex-1 p-2 mr-2 border border-gray-300 rounded"
        type="text"
        placeholder="Type your message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
        autoFocus={false}
      />
      <button
        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        type="submit"
      >
        Send
      </button>
    </form>
  );
};

export default ChatInput; 