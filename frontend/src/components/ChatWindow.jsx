import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import ChartComponent from './Chart';
import MessageContent from './MessageContent';

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

  // Helper function to parse markdown tables
  const parseTable = (tableText) => {
    // Split into lines and remove empty ones
    const lines = tableText.split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes('|'));

    if (lines.length < 3) return null;

    // Process headers
    const headerLine = lines[0];
    const headers = headerLine
      .split('|')
      .map(cell => cell.trim())
      .filter(Boolean)
      .map(cell => {
        // Handle both string and React element cases
        if (typeof cell === 'object' && cell !== null) {
          return String(cell.props?.children || '');
        }
        return cell;
      });

    // Validate separator line
    const separatorLine = lines[1];
    const isValidSeparator = separatorLine
      .split('|')
      .some(cell => cell.trim().startsWith('-'));

    if (!isValidSeparator) return null;

    // Process data rows
    const rows = lines.slice(2)
      .map(line => line
        .split('|')
        .map(cell => cell.trim())
        .filter(Boolean)
        .map(cell => {
          if (typeof cell === 'object' && cell !== null) {
            return String(cell.props?.children || '');
          }
          return cell;
        }))
      .filter(row => row.length === headers.length);

    return { headers, rows };
  };

  const MarkdownTable = ({ children }) => {
    const tableText = Array.isArray(children) ? children.join('\n') : String(children);
    const parsedTable = parseTable(tableText);
    
    if (!parsedTable) {
      return <pre className="whitespace-pre-wrap break-words">{tableText}</pre>;
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
                  <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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

  // Add this function after the existing imports
  const parseContentToBlocks = (content) => {
    const blocks = [];
    let currentText = '';

    // Helper to add accumulated text as a block
    const addTextBlock = () => {
      if (currentText.trim()) {
        blocks.push({
          type: 'text',
          content: currentText.trim()
        });
        currentText = '';
      }
    };

    // Helper to preprocess and evaluate expressions in JSON string
    const preprocessJsonExpressions = (jsonString) => {
      try {
        // First do a simple check if there are likely any expressions to evaluate
        if (!jsonString.includes('+') && !jsonString.includes('-') && 
            !jsonString.includes('*') && !jsonString.includes('/')) {
          return jsonString; // No expressions to evaluate
        }
        
        console.log('Processing JSON with expressions:', jsonString.slice(0, 100) + '...');
        
        // First approach: Try to fix arithmetic expressions in field values
        let processed = jsonString;
        
        // Handle expressions in object values like: "field": 100 + 200
        // Updated regex to better handle division operations
        const expressionRegex = /("[^"]+"\s*:\s*)([^"][^,\}]+(?:[\+\-\*\/])[^,\}]+)/g;
        processed = processed.replace(expressionRegex, (match, fieldPart, expressionPart) => {
          try {
            // Clean up the expression
            const cleanExpr = expressionPart.trim()
              .replace(/\s+/g, '') // Remove all whitespace
              .replace(/([+\-*/])/g, ' $1 '); // Add spaces around operators
            
            // Only allow basic arithmetic operations and numbers
            if (/^[\d\s+\-*/()\\.]+$/.test(cleanExpr)) {
              // Handle division by wrapping numbers in parseFloat
              const wrappedExpr = cleanExpr.replace(
                /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,
                'parseFloat($1)/parseFloat($2)'
              );
              const result = eval(wrappedExpr);
              console.log(`Evaluated expression "${cleanExpr}" to ${result}`);
              return `${fieldPart}${result}`;
            }
            return match; // If not safe, leave unchanged
          } catch (evalError) {
            console.warn('Failed to evaluate expression:', evalError, 'in', match);
            return match; // Keep original if evaluation fails
          }
        });
        
        // Second approach: Handle expressions inside arrays
        const arrayExprRegex = /\[([^\[\]]*)\]/g;
        processed = processed.replace(arrayExprRegex, (match, arrayContent) => {
          // Only process if it contains arithmetic operators
          if (!/[+\-*/]/.test(arrayContent)) return match;
          
          try {
            const itemStrings = arrayContent.split(',');
            const processedItems = itemStrings.map(item => {
              const trimmed = item.trim()
                .replace(/\s+/g, '') // Remove all whitespace
                .replace(/([+\-*/])/g, ' $1 '); // Add spaces around operators
              
              // Only evaluate if it looks like a numeric expression
              if (/^[\d\s+\-*/()\\.]+$/.test(trimmed)) {
                // Handle division by wrapping numbers in parseFloat
                const wrappedExpr = trimmed.replace(
                  /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,
                  'parseFloat($1)/parseFloat($2)'
                );
                return eval(wrappedExpr);
              }
              return trimmed;
            });
            return '[' + processedItems.join(', ') + ']';
          } catch (error) {
            console.warn('Failed to process array expressions:', error);
            return match;
          }
        });
        
        console.log('JSON after preprocessing:', processed.slice(0, 100) + '...');
        return processed;
      } catch (error) {
        console.warn('Error preprocessing JSON expressions:', error);
        return jsonString; // Return original on error
      }
    };

    // Split content into lines
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';
    let inVegaBlock = false;
    let vegaBlockContent = '';

    for (let line of lines) {
      // Handle code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          addTextBlock();
          inCodeBlock = true;
          codeBlockLanguage = line.slice(3).trim();
          codeBlockContent = '';
        } else {
          // Ending a code block
          inCodeBlock = false;
          blocks.push({
            type: 'code',
            content: codeBlockContent.trim(),
            language: codeBlockLanguage
          });
          codeBlockContent = '';
        }
        continue;
      }

      // Handle Vega-Lite blocks
      if (line.includes('[GRAPH_START]')) {
        addTextBlock();
        inVegaBlock = true;
        vegaBlockContent = '';
        continue;
      }
      if (line.includes('[GRAPH_END]')) {
        inVegaBlock = false;
        try {
          // First validate that the content looks like JSON before trying to parse
          const trimmedContent = vegaBlockContent.trim();
          // Check if it's a valid JSON candidate before parsing
          if (trimmedContent && 
              (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) ||
              (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
            try {
              // Preprocess JSON to evaluate any expressions
              console.log('Found potential Vega-Lite spec, preprocessing...');
              const processedContent = preprocessJsonExpressions(trimmedContent);
              
              // Log differences for debugging
              if (processedContent !== trimmedContent) {
                console.log('Preprocessing made changes to the JSON content');
              }
              
              try {
                const vegaSpec = JSON.parse(processedContent);
                console.log('Successfully parsed Vega-Lite spec:', vegaSpec);
                blocks.push({
                  type: 'vega-lite',
                  content: vegaSpec
                });
              } catch (jsonParseError) {
                console.error('JSON parse error:', jsonParseError.message);
                // Try a more aggressive approach - replace all expressions with numeric values
                try {
                  // Replace anything that looks like a calculation with 0 to at least make it valid JSON
                  const simplifiedContent = processedContent.replace(/(\d+\s*[\+\-\*\/]\s*\d+(\s*[\+\-\*\/]\s*\d+)*)/g, '0');
                  const fallbackSpec = JSON.parse(simplifiedContent);
                  console.log('Used simplified JSON as fallback');
                  blocks.push({
                    type: 'vega-lite',
                    content: fallbackSpec
                  });
                } catch (fallbackError) {
                  // If all else fails, show as code
                  console.error('Fallback parsing also failed:', fallbackError);
                  blocks.push({
                    type: 'code',
                    content: trimmedContent,
                    language: 'json'
                  });
                }
              }
            } catch (jsonError) {
              console.error('Failed to preprocess or parse Vega-Lite spec:', jsonError);
              console.log('Raw content that failed:', trimmedContent);
              blocks.push({
                type: 'code',
                content: trimmedContent,
                language: 'json'
              });
            }
          } else {
            // Not valid JSON structure, treat as code
            console.warn('Vega-Lite block does not contain valid JSON structure');
            blocks.push({
              type: 'code',
              content: trimmedContent,
              language: 'json'
            });
          }
        } catch (error) {
          console.error('Error processing Vega-Lite block:', error);
          blocks.push({
            type: 'text',
            content: `Error parsing chart: ${error.message}`
          });
        }
        vegaBlockContent = '';
        continue;
      }

      // Accumulate content based on current state
      if (inCodeBlock) {
        codeBlockContent += line + '\n';
      } else if (inVegaBlock) {
        vegaBlockContent += line + '\n';
      } else {
        currentText += line + '\n';
      }
    }

    // Add any remaining text
    addTextBlock();

    // Handle unclosed blocks
    if (inCodeBlock) {
      blocks.push({
        type: 'code',
        content: codeBlockContent.trim(),
        language: codeBlockLanguage || 'text'
      });
    }
    
    if (inVegaBlock) {
      blocks.push({
        type: 'text',
        content: vegaBlockContent.trim()
      });
    }

    return blocks;
  };

  // Find the renderMessageContent function and replace it with:
  const renderMessageContent = (message) => {
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
              <div className="flex-shrink-0">
                {userDetails.imageUrl ? (
                  <img 
                    src={getAvatarImageUrl(userDetails.imageUrl)} 
                    alt="You" 
                    className="w-8 h-8 rounded-full object-cover" 
                    title={userDetails.name || "You"}
                    onError={(e) => handleImageError(e, "User")}
                  />
                ) : (
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${getAvatarColor(true)}`}
                    title={userDetails.name || "You"}
                  >
                    {userDetails.name ? getInitials(userDetails.name) : 'U'}
                  </div>
                )}
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