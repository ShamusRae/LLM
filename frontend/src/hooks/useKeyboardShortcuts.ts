import { useEffect, useRef } from 'react';

export type ShortcutKey = string; // e.g., 'mod+z', 'mod+shift+z', 'delete'

export type ShortcutHandlers = Record<ShortcutKey, () => void>;

/**
 * A hook for handling keyboard shortcuts
 * @param handlers - An object where keys are keyboard shortcut patterns and values are handler functions
 * 
 * Supported modifiers: mod (Ctrl on Windows/Linux, Cmd on Mac), shift, alt, ctrl
 * Example: { 'mod+z': handleUndo, 'mod+shift+z': handleRedo, 'delete': handleDelete }
 */
export const useKeyboardShortcuts = (handlers: ShortcutHandlers): void => {
  // Use a ref to avoid recreating the handler on every render
  const handlersRef = useRef<ShortcutHandlers>(handlers);
  
  // Update the ref whenever handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Ignore key events when focused on input elements
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      // Map the mod key to the appropriate key for the platform
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? 'metaKey' : 'ctrlKey';
      
      // Generate a string representation of the pressed combination
      const keyCombinations = Object.keys(handlersRef.current);
      
      for (const combo of keyCombinations) {
        const keys = combo.toLowerCase().split('+');
        const mainKey = keys[keys.length - 1];
        
        // Check if the main key matches
        if (event.key.toLowerCase() !== mainKey && event.code.toLowerCase() !== `key${mainKey}`) {
          // Special case for Delete key which might be represented differently
          if (mainKey === 'delete' && event.key !== 'Delete' && event.key !== 'Backspace') {
            continue;
          }
          // For any other non-matching key, skip to the next combo
          if (!(mainKey === 'delete' && (event.key === 'Delete' || event.key === 'Backspace'))) {
            continue;
          }
        }
        
        // Check modifiers
        let modifiersMatch = true;
        
        // Check for mod key (Ctrl on Windows/Linux, Cmd on Mac)
        if (keys.includes('mod') && !event[modKey]) {
          modifiersMatch = false;
        }
        
        // Check for shift key
        if (keys.includes('shift') && !event.shiftKey) {
          modifiersMatch = false;
        }
        
        // Check for alt key
        if (keys.includes('alt') && !event.altKey) {
          modifiersMatch = false;
        }
        
        // Check for explicit ctrl key (different from mod)
        if (keys.includes('ctrl') && !event.ctrlKey) {
          modifiersMatch = false;
        }
        
        // If all modifiers match, execute the handler
        if (modifiersMatch) {
          event.preventDefault();
          handlersRef.current[combo]();
          return;
        }
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}; 