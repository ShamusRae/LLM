import React, { useRef } from 'react';
import ReactDOM from 'react-dom';

const Modal = ({ children, onClose }) => {
  const startInfo = useRef(null);

  const handleBackdropMouseDown = (e) => {
    // Only record info if clicking on the backdrop
    if (e.target === e.currentTarget) {
      startInfo.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    }
    e.stopPropagation();
  };

  const handleBackdropMouseUp = (e) => {
    if (e.target === e.currentTarget && startInfo.current) {
      // Check for active text selection
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim() !== '') {
        e.stopPropagation();
        return;
      }

      const dx = Math.abs(e.clientX - startInfo.current.x);
      const dy = Math.abs(e.clientY - startInfo.current.y);
      const dt = Date.now() - startInfo.current.time;
      const DIST_THRESHOLD = 5; // pixels
      const TIME_THRESHOLD = 150; // milliseconds

      if (dx < DIST_THRESHOLD && dy < DIST_THRESHOLD && dt < TIME_THRESHOLD) {
        onClose();
      }
    }
    e.stopPropagation();
  };

  const handleMouseEvent = (e) => {
    e.stopPropagation();
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
      onMouseMove={handleMouseEvent}
      onKeyDown={handleMouseEvent}
    >
      <div 
        className="bg-white rounded-lg p-6 w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={handleMouseEvent}
        onMouseDown={handleMouseEvent}
        onMouseUp={handleMouseEvent}
        onMouseMove={handleMouseEvent}
        onKeyDown={handleMouseEvent}
        onSelect={handleMouseEvent}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal; 