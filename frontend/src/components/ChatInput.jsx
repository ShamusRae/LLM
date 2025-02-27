import React, { useState, useRef } from 'react';

const ChatInput = ({ onSendMessage }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };
  
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex items-center">
      <button 
        className="bg-gray-300 text-gray-700 rounded-l px-3 py-2 hover:bg-gray-400 transition-colors"
        onClick={focusInput}
        title="Focus input"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>
      <input 
        ref={inputRef}
        className="flex-1 border-y p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        placeholder="Type your message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        autoFocus={false}
      />
      <button 
        className="bg-blue-600 text-white rounded-r px-4 py-2 hover:bg-blue-700 transition-colors"
        onClick={handleSubmit}
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput; 