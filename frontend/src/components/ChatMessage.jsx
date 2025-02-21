import React from 'react';

const ChatMessage = ({ messageData }) => {
  const { sender, message, timestamp } = messageData;
  return (
    <div className="mb-2">
      <div className="flex items-center">
        <span className="font-semibold mr-2">{sender}</span>
        <span className="text-gray-500 text-xs">{new Date(timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="ml-4">
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
};

export default ChatMessage; 