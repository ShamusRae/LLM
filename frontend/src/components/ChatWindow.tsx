import React from 'react';
import { Message, Block, ParsedTable } from '../types/chat';
import MessageContent from './MessageContent';

interface ChatWindowProps {
  messages: Message[];
  onRetry?: (messageId: string) => void;
}

interface TableCell {
  props?: {
    children?: string;
  };
}

interface GraphMatch {
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
  content: string;
  marker: { start: string; end: string; };
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onRetry }) => {
  const getInitials = (name: string): string => {
    if (!name) return 'A';
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  const getAvatarColor = (isUser: boolean): string => {
    return isUser ? 'bg-blue-500' : 'bg-purple-500';
  };

  const extractImageUrl = (text: string): string | null => {
    const imageUrlRegex = /!\[.*?\]\((.*?)\)|https?:\/\/\S+\.(?:jpg|jpeg|gif|png|webp)(?:\?[^\s)]*)?/i;
    const match = text.match(imageUrlRegex);
    return match ? (match[1] || match[0]) : null;
  };

  const parseTable = (tableText: string): ParsedTable | null => {
    const lines = tableText.split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes('|'));

    if (lines.length < 3) return null;

    const headerLine = lines[0];
    const headers = headerLine
      .split('|')
      .map(cell => cell.trim())
      .filter(Boolean)
      .map((cell: string | TableCell) => {
        if (typeof cell === 'object' && cell !== null) {
          return String(cell.props?.children || '');
        }
        return cell;
      });

    const separatorLine = lines[1];
    const isValidSeparator = separatorLine
      .split('|')
      .some(cell => cell.trim().startsWith('-'));

    if (!isValidSeparator) return null;

    const rows = lines.slice(2)
      .map(line => line
        .split('|')
        .map(cell => cell.trim())
        .filter(Boolean)
        .map((cell: string | TableCell) => {
          if (typeof cell === 'object' && cell !== null) {
            return String(cell.props?.children || '');
          }
          return cell;
        }))
      .filter(row => row.length === headers.length);

    return { headers, rows };
  };

  const findNextGraph = (startIndex: number, text: string): GraphMatch | null => {
    const markers = [
      { start: '[GRAPH_START]', end: '[GRAPH_END]' },
      { start: '```json', end: '```' },
      { start: '```chart', end: '```' }
    ];

    let bestMatch: GraphMatch | null = null;
    let earliestStart = Infinity;

    for (const marker of markers) {
      const startPos = text.indexOf(marker.start, startIndex);
      if (startPos !== -1 && startPos < earliestStart) {
        const endPos = text.indexOf(marker.end, startPos + marker.start.length);
        if (endPos !== -1) {
          const beforeStart = text.substring(Math.max(0, startPos - 3), startPos);
          if (!beforeStart.includes('`')) {
            earliestStart = startPos;
            bestMatch = {
              start: startPos,
              end: endPos + marker.end.length,
              contentStart: startPos + marker.start.length,
              contentEnd: endPos,
              content: '',
              marker
            };
          }
        }
      }
    }

    if (bestMatch) {
      let cleanContent = text.slice(bestMatch.contentStart, bestMatch.contentEnd).trim();
      if (bestMatch.marker.start.includes('```')) {
        cleanContent = cleanContent
          .replace(/^```(?:json|chart-[a-z]+)?\n/, '')
          .replace(/\n```$/, '')
          .trim();
      }
      bestMatch.content = cleanContent;
    }

    return bestMatch;
  };

  const parseContentToBlocks = (content: string): Block[] => {
    const blocks: Block[] = [];
    let currentText = '';

    const addTextBlock = () => {
      if (currentText.trim()) {
        // Try to detect if the content is a JSON Vega-Lite spec
        try {
          let jsonContent;
          const trimmedContent = currentText.trim();
          
          // First try to parse as direct JSON
          try {
            jsonContent = JSON.parse(trimmedContent);
          } catch {
            // If that fails, try to extract from markers
            if (trimmedContent.includes('[GRAPH_START]') && trimmedContent.includes('[GRAPH_END]')) {
              const extracted = trimmedContent
                .split('[GRAPH_START]')[1]
                .split('[GRAPH_END]')[0]
                .trim();
              jsonContent = JSON.parse(extracted);
            }
          }

          // Check if this looks like a Vega-Lite spec
          if (jsonContent && jsonContent.data && jsonContent.mark && jsonContent.encoding) {
            console.log('Found Vega-Lite spec in text block:', jsonContent);
            blocks.push({
              type: 'vega-lite',
              content: jsonContent
            });
            currentText = '';
            return;
          }
        } catch (error) {
          // Not valid JSON or not a Vega-Lite spec, continue with normal text
          console.log('Failed to parse text as Vega-Lite spec:', error);
        }
        
        blocks.push({
          type: 'text',
          content: currentText.trim()
        });
        currentText = '';
      }
    };

    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';

    for (let line of lines) {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          addTextBlock();
          inCodeBlock = true;
          codeBlockLanguage = line.slice(3).trim();
          codeBlockContent = '';
        } else {
          inCodeBlock = false;
          // Check if code block contains a Vega-Lite spec
          if (codeBlockLanguage === 'json' || codeBlockLanguage === 'vega-lite') {
            try {
              let jsonContent;
              const trimmedContent = codeBlockContent.trim();
              
              // First try to parse as direct JSON
              try {
                jsonContent = JSON.parse(trimmedContent);
              } catch {
                // If that fails, try to extract from markers
                if (trimmedContent.includes('[GRAPH_START]') && trimmedContent.includes('[GRAPH_END]')) {
                  const extracted = trimmedContent
                    .split('[GRAPH_START]')[1]
                    .split('[GRAPH_END]')[0]
                    .trim();
                  jsonContent = JSON.parse(extracted);
                }
              }

              // Check if this looks like a Vega-Lite spec
              if (jsonContent && jsonContent.data && jsonContent.mark && jsonContent.encoding) {
                console.log('Found Vega-Lite spec in code block:', jsonContent);
                blocks.push({
                  type: 'vega-lite',
                  content: jsonContent
                });
                continue;
              }
            } catch (error) {
              // Not valid JSON or not a Vega-Lite spec
              console.log('Failed to parse code block as Vega-Lite spec:', error);
            }
          }
          blocks.push({
            type: 'code',
            content: codeBlockContent.trim(),
            language: codeBlockLanguage
          });
          codeBlockContent = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n';
      } else {
        currentText += line + '\n';
      }
    }

    addTextBlock();
    return blocks;
  };

  const renderMessageContent = (message: Message) => {
    const { content, state } = message;
    
    if (!content.text) {
      console.log('Attempted to render null/undefined message text');
      return null;
    }

    const blocks = parseContentToBlocks(content.text);
    return <MessageContent blocks={blocks} />;
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4 min-h-[500px] max-h-[800px] overflow-y-auto">
      {messages.map((message) => {
        console.log('Rendering message:', {
          id: message.id,
          isUser: message.metadata.isUser,
          avatarId: message.metadata.avatar?.id,
          state: message.state.type,
          contentLength: message.content.text?.length,
          preview: message.content.text?.substring(0, 50)
        });

        const containerClasses = message.metadata.isUser
          ? 'flex-row-reverse'
          : 'flex-row';

        return (
          <div key={message.id} className="space-y-2">
            <div className={`flex ${containerClasses} items-start space-x-2`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getAvatarColor(message.metadata.isUser)} flex items-center justify-center text-white text-sm font-medium`}>
                {message.metadata.avatar?.imageUrl ? (
                  <img
                    src={message.metadata.avatar.imageUrl}
                    alt={message.metadata.avatar.name}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = ''; // Clear the broken image
                      target.onerror = null; // Prevent infinite loop
                      target.className = 'hidden'; // Hide the img element
                      target.parentElement!.textContent = getInitials(message.metadata.avatar?.name || '');
                    }}
                  />
                ) : (
                  getInitials(message.metadata.avatar?.name || '')
                )}
              </div>
              <div className="flex-1 space-y-2">
                {message.content.thinking && (
                  <div className="bg-gray-100 rounded-lg p-4 mb-2 text-gray-600 italic">
                    Thinking: {message.content.thinking}
                  </div>
                )}
                <div className="bg-gray-100 rounded-lg p-4">
                  {renderMessageContent(message)}
                </div>
                {message.state.type === 'error' && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <span>{message.state.error || 'An error occurred'}</span>
                    {onRetry && (
                      <button
                        onClick={() => onRetry(message.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatWindow; 