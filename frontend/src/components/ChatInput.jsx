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
    <form onSubmit={handleSubmit} className="flex items-center px-4 py-3 border-t border-[var(--rovesg-border)] bg-[var(--rovesg-surface)]/85">
      <input
        ref={inputRef}
        className="flex-1 p-3 mr-2 border border-[var(--rovesg-border)] rounded-xl bg-[#182025] text-[var(--rovesg-text)] placeholder:text-[var(--rovesg-text-muted)] focus:ring-2 focus:ring-[var(--rovesg-primary)] focus:border-[var(--rovesg-primary)] outline-none"
        type="text"
        placeholder="Ask Rovesg..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
        autoFocus={false}
      />
      <button
        className="px-4 py-2.5 rounded-xl rovesg-primary-button"
        type="submit"
      >
        Send
      </button>
    </form>
  );
};

export default ChatInput; 