import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import ChartComponent from './Chart';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-2 rounded-md bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const ChatWindow = ({ messages, selectedAvatar, sessionId }) => {
  const [expandedThinking, setExpandedThinking] = useState({});
  const messagesEndRef = useRef(null);
  const [userDetails, setUserDetails] = useState({
    name: '',
    imageUrl: null
  });
  const [renderedMessages, setRenderedMessages] = useState([]);

  useEffect(() => {
    console.log('ChatWindow received messages:', messages.map(m => ({
      id: m.id,
      sessionId: m.sessionId,
      isUser: m.metadata.isUser,
      avatarId: m.metadata.avatar?.id,
      round: m.round,
      state: m.state.type,
      contentLength: m.content.text?.length,
      preview: m.content.text?.substring(0, 50)
    })));

    // Filter messages for current session
    const currentSessionMessages = messages.filter(m => 
      !m.sessionId || // Include messages without sessionId (backwards compatibility)
      m.sessionId === sessionId // Include messages from current session
    );
    
    console.log('Filtered messages for session:', {
      sessionId,
      totalMessages: messages.length,
      filteredMessages: currentSessionMessages.length,
      messageStates: currentSessionMessages.map(m => ({
        id: m.id,
        state: m.state.type,
        contentLength: m.content.text?.length
      }))
    });
    
    setRenderedMessages(currentSessionMessages);
  }, [messages, sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [renderedMessages]);

  const getAvatarImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) return imageUrl;
    return `http://localhost:3001${imageUrl}`;
  };

  const handleImageError = (e, avatarName) => {
    console.error(`Failed to load avatar image for ${avatarName}`);
    e.target.onerror = null; // Prevent infinite error loop
    e.target.style.display = 'none';
    e.target.nextElementSibling.style.display = 'flex';
  };

  // Helper function to generate a random color for the avatar background
  const getRandomColor = () => {
    const colors = ['9B59B6', '3498DB', '1ABC9C', 'F1C40F', 'E74C3C'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Helper function to get contrasting text color
  const getTextColor = () => 'FFFFFF';

  useEffect(() => {
    // Load user details when component mounts
    const loadUserDetails = async () => {
      try {
        const response = await axios.get('/api/settings');
        // Only set the imageUrl if it's a valid URL or path
        const imageUrl = response.data?.userDetails?.imageUrl;
        setUserDetails(prev => {
          // Only update if the values have changed
          if (prev.name !== (response.data?.userDetails?.name || '') ||
              prev.imageUrl !== (imageUrl && imageUrl !== 'null' ? imageUrl : null)) {
            return {
              name: response.data?.userDetails?.name || '',
              imageUrl: imageUrl && imageUrl !== 'null' ? imageUrl : null
            };
          }
          return prev;
        });
      } catch (err) {
        console.error('Error loading user details:', err);
        // Only set default values if we don't already have values
        setUserDetails(prev => {
          if (prev.name || prev.imageUrl) return prev;
          return { name: '', imageUrl: null };
        });
      }
    };
    loadUserDetails();
  }, []); // Empty dependency array since we only want to load on mount

  const toggleThinking = (index) => {
    setExpandedThinking(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  const getAvatarColor = (isUser) => {
    return isUser ? 'bg-blue-500' : 'bg-purple-500';
  };

  // Helper function to check if text contains an image URL
  const extractImageUrl = (text) => {
    const imageUrlRegex = /!\[.*?\]\((.*?)\)|https?:\/\/\S+\.(?:jpg|jpeg|gif|png|webp)(?:\?[^\s)]*)?/i;
    const match = text.match(imageUrlRegex);
    return match ? match[1] || match[0] : null;
  };

  // Update the parseTable function to be more robust
  const parseTable = (tableText) => {
    console.log('Raw table text:', tableText);
    
    // First, clean up the text
    const cleanText = tableText
      .replace(/,\[object Object\],?/g, '') // Remove object Object markers
      .replace(/^\s*,/gm, '') // Remove leading commas
      .replace(/,\s*$/gm, '') // Remove trailing commas
      .replace(/\|\s*\|/g, '|') // Clean up empty cells
      .trim();

    const lines = cleanText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('|'));

    if (lines.length < 3) {
      console.log('Table too short:', lines.length);
      return null;
    }

    // Parse headers - handle both normal text and React elements
    const headerLine = lines[0];
    const headers = headerLine
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0)
      .map(cell => {
        if (typeof cell === 'object' && cell !== null) {
          return cell.props?.children || '';
        }
        return cell;
      });

    // Verify separator line
    const separatorLine = lines[1];
    if (!separatorLine.includes('|-') && !separatorLine.includes('-|')) {
      console.log('Invalid separator line:', separatorLine);
      return null;
    }

    // Parse rows - handle both normal text and React elements
    const rows = lines.slice(2)
      .map(line => {
        const cells = line
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0)
          .map(cell => {
            if (typeof cell === 'object' && cell !== null) {
              return cell.props?.children || '';
            }
            return cell;
          });
        return cells;
      })
      .filter(row => row.length > 0); // Remove empty rows

    console.log('Parsed table:', { headers, rows });
    return { headers, rows };
  };

  // Update the MarkdownTable component
  const MarkdownTable = ({ children }) => {
    console.log('MarkdownTable received:', children);
    const tableText = Array.isArray(children) ? children.join('\n') : children.toString();
    
    // Clean up the table text
    const cleanedText = tableText
      .replace(/,\[object Object\],?/g, '') // Remove [object Object]
      .replace(/\|\s*\|/g, '|') // Remove empty cells
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith(',') && line.includes('|')) // Remove empty lines and invalid rows
      .join('\n');

    const parsedTable = parseTable(cleanedText);
    
    if (!parsedTable) {
      console.log('Failed to parse table, returning raw text');
      return <pre>{cleanedText}</pre>;
    }

    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-gray-50">
            <tr>
              {parsedTable.headers.map((header, i) => (
                <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parsedTable.rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Update the findNextGraph function to be more precise
  const findNextGraph = (startIndex, text) => {
    // Look for all possible markers
    const markers = [
      { start: '[GRAPH_START]', end: '[GRAPH_END]' },
      { start: '```json', end: '```' },
      { start: '```chart', end: '```' }
    ];

    let bestMatch = null;
    let earliestStart = Infinity;

    for (const marker of markers) {
      const startPos = text.indexOf(marker.start, startIndex);
      if (startPos !== -1 && startPos < earliestStart) {
        const endPos = text.indexOf(marker.end, startPos + marker.start.length);
        if (endPos !== -1) {
          // Make sure we're not inside a code block already
          const beforeStart = text.substring(Math.max(0, startPos - 3), startPos);
          if (!beforeStart.includes('`')) {
            earliestStart = startPos;
            bestMatch = {
              start: startPos,
              end: endPos + marker.end.length,
              contentStart: startPos + marker.start.length,
              contentEnd: endPos,
              marker
            };
          }
        }
      }
    }

    if (bestMatch) {
      // Clean up the content based on marker type
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

  // Custom renderer for markdown elements
  const renderers = {
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const content = children.join('');
      
      return !inline && match ? (
        <div className="relative">
          <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto my-4">
            <code className={className} {...props}>
              {content}
            </code>
          </pre>
          <CopyButton text={content} />
        </div>
      ) : (
        <code className={`bg-gray-100 rounded px-1 ${className || ''}`} {...props}>
          {content}
        </code>
      );
    },
    // Replace table renderers with our custom component
    table: ({ children }) => <MarkdownTable>{children}</MarkdownTable>,
    // Add other useful markdown renderers
    p: ({ children }) => {
      const text = String(children);
      // Check if this is a table
      if (text.includes('|')) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length >= 2 && lines[1].includes('-')) {
          // This looks like a table, let's parse it
          const headers = lines[0]
            .split('|')
            .map(cell => cell.trim())
            .filter(Boolean);

          // Verify separator line
          const separatorLine = lines[1];
          if (!separatorLine.match(/^\|?[\s-:|]+\|?$/)) {
            return <p className="text-gray-700 mb-4">{text}</p>;
          }

          const rows = lines.slice(2)
            .map(line => 
              line
                .split('|')
                .map(cell => cell.trim())
                .filter(Boolean)
            );

          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header, i) => (
                      <th 
                        key={i}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {row.map((cell, j) => (
                        <td 
                          key={j}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }
      return <p className="text-gray-700 mb-4">{children}</p>;
    },
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold mb-3 text-gray-900">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-bold mb-2 text-gray-900">{children}</h3>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-6 mb-4 text-gray-700">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 mb-4 text-gray-700">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="mb-1">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4 text-gray-600">
        {children}
      </blockquote>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto my-4">
        {children}
      </pre>
    ),
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    strong: ({ children }) => (
      <strong className="font-bold">{children}</strong>
    )
  };

  // Update the renderGraph function to handle the cleaned content
  const renderGraph = (graphJson) => {
    try {
      // Clean the input string
      const cleanJson = graphJson
        .replace(/^```(?:json|chart-[a-z]+)?\n/, '')
        .replace(/\n```$/, '')
        .replace(/^json\n/, '')
        .replace(/`/g, '')
        .trim();

      console.log('Attempting to parse graph JSON:', cleanJson);
      
      const parsedGraph = JSON.parse(cleanJson);
      console.log('Successfully parsed graph data');
      
      return (
        <div className="w-full h-[400px] border border-gray-200 rounded-lg p-4 my-4">
          <ChartComponent 
            type={parsedGraph.type}
            data={parsedGraph.data}
            options={parsedGraph.options || {}}
          />
        </div>
      );
    } catch (err) {
      console.error('Failed to parse graph JSON:', err);
      return (
        <div className="relative">
          <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto my-4">
            <code>{graphJson}</code>
          </pre>
          <CopyButton text={graphJson} />
        </div>
      );
    }
  };

  // Update the renderMessageContent function to handle all message types
  const renderMessageContent = (message) => {
    const { content, state } = message;
    
    if (!content.text) {
      console.log('Attempted to render null/undefined message text');
      return null;
    }

    // Parse any graph data in the message
    const parseGraphs = (text) => {
      const graphs = [];
      let currentIndex = 0;
      let modifiedText = text;

      while (true) {
        const startMarker = '[GRAPH_START]';
        const endMarker = '[GRAPH_END]';
        
        const startIndex = modifiedText.indexOf(startMarker, currentIndex);
        if (startIndex === -1) break;
        
        const endIndex = modifiedText.indexOf(endMarker, startIndex);
        if (endIndex === -1) break;

        // Extract everything between markers and clean up whitespace
        const graphJson = modifiedText
          .slice(startIndex + startMarker.length, endIndex)
          .replace(/^\s*\n/, '') // Remove first newline
          .replace(/\n\s*$/, '') // Remove last newline
          .trim();

        try {
          const graphData = JSON.parse(graphJson);
          graphs.push(graphData);
          
          // Replace the graph JSON with a placeholder
          const placeholder = `[GRAPH_${graphs.length - 1}]`;
          modifiedText = modifiedText.slice(0, startIndex) + placeholder + modifiedText.slice(endIndex + endMarker.length);
          currentIndex = startIndex + placeholder.length;
        } catch (error) {
          console.error('Failed to parse graph JSON:', error, '\nJSON string:', graphJson);
          currentIndex = endIndex + endMarker.length;
        }
      }

      return { modifiedText, graphs };
    };

    // Process the message content
    const { modifiedText, graphs } = parseGraphs(content.text);
    
    // Split the text into segments, separating graph placeholders
    const segments = modifiedText.split(/(\[GRAPH_\d+\])/);

    return (
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none">
          {segments.map((segment, index) => {
            const graphMatch = segment.match(/\[GRAPH_(\d+)\]/);
            if (graphMatch) {
              const graphIndex = parseInt(graphMatch[1]);
              const graphData = graphs[graphIndex];
              return (
                <div key={index} className="w-full h-[400px] border border-gray-200 rounded-lg p-4 my-4">
                  <ChartComponent 
                    type={graphData.type}
                    data={graphData.data}
                    options={graphData.options || {}}
                  />
                </div>
              );
            }
            return (
              <ReactMarkdown 
                key={index}
                components={renderers}
                rehypePlugins={[rehypeRaw]}
                skipHtml={false}
              >
                {segment}
              </ReactMarkdown>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4 min-h-[500px] max-h-[800px] overflow-y-auto">
      {renderedMessages.map((message) => {
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

        const messageClasses = message.metadata.isUser
          ? 'bg-blue-100 text-blue-800'
          : message.metadata.isError
            ? 'bg-red-100 border border-red-300 text-red-700'
            : message.state.type === 'thinking'
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : message.state.type === 'streaming'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-gray-100 text-gray-700';

        return (
          <div 
            key={message.id} 
            className={`mb-4 flex items-start gap-2 ${containerClasses}`}
          >
            {!message.metadata.isUser && message.metadata.avatar && (
              <div className="flex-shrink-0">
                {message.metadata.avatar.imageUrl ? (
                  <img 
                    src={getAvatarImageUrl(message.metadata.avatar.imageUrl)} 
                    alt={message.metadata.avatar.name} 
                    className="w-8 h-8 rounded-full object-cover" 
                    title={message.metadata.avatar.name}
                    onError={(e) => handleImageError(e, message.metadata.avatar.name)}
                  />
                ) : (
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(false)}`}
                    title={message.metadata.avatar.name || 'AI Assistant'}
                  >
                    {getInitials(message.metadata.avatar.name)}
                  </div>
                )}
              </div>
            )}
            <div 
              className={`p-3 rounded-lg ${messageClasses} max-w-[70%] flex-grow-0`}
            >
              {message.metadata.isError ? (
                <p className="text-red-700">{message.content.text}</p>
              ) : message.state.type === 'thinking' ? (
                <div className="flex flex-col gap-2">
                  <div className="text-sm">
                    {message.content.text}
                  </div>
                  <div className="animate-pulse flex space-x-2 items-center">
                    <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                  </div>
                </div>
              ) : (
                <div>
                  {renderMessageContent(message)}
                  {message.state.type === 'streaming' && (
                    <div className="mt-2 animate-pulse flex space-x-2 items-center">
                      <div className="h-1 w-1 bg-green-400 rounded-full"></div>
                      <div className="h-1 w-1 bg-green-400 rounded-full"></div>
                      <div className="h-1 w-1 bg-green-400 rounded-full"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {message.metadata.isUser && (
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${getAvatarColor(true)}`}
                title="You"
              >
                {userDetails.name ? getInitials(userDetails.name) : 'U'}
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow; 