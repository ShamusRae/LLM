import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import ChartComponent from './Chart';
import MessageContent from './MessageContent.tsx';
import MCPToolUsage from './MCPToolUsage';

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
    const currentSessionMessages = messages.filter(message => 
      !message.sessionId || // Include messages without sessionId for backward compatibility
      message.sessionId === sessionId
    );

    // Ensure messages have unique IDs by adding a suffix if duplicates are found
    const uniqueMessages = [];
    const seenIds = new Set();
    
    currentSessionMessages.forEach(message => {
      if (!message.id) {
        // Generate an ID if it doesn't exist
        message = { ...message, id: Date.now() + "-" + Math.random().toString(36).substring(2, 9) };
      }
      
      if (seenIds.has(message.id)) {
        // Create a new unique ID by adding a suffix
        const newId = `${message.id}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        console.warn(`Duplicate message ID found: ${message.id}, creating new ID: ${newId}`);
        uniqueMessages.push({ ...message, id: newId });
      } else {
        seenIds.add(message.id);
        uniqueMessages.push(message);
      }
    });

    // Sort messages by timestamp
    uniqueMessages.sort((a, b) => {
      // If timestamps are available, use them
      if (a.timestamp && b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      // Otherwise maintain the original order
      return currentSessionMessages.indexOf(a) - currentSessionMessages.indexOf(b);
    });
    
    setRenderedMessages(uniqueMessages);
    
    console.log(`Filtered messages for session: ${sessionId}, total: ${messages.length}, filtered: ${uniqueMessages.length}, thinking: ${uniqueMessages.filter(m => m.thinking).length}, streaming: ${uniqueMessages.filter(m => m.streaming).length}`);
  }, [messages, sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Enhanced scrolling - watches not just for new messages but also message state changes
  useEffect(() => {
    // Delayed scroll to ensure rendering is complete
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [
    // Use a stable dependency that captures the same information
    renderedMessages.length,
    // Create a string representation of all message states to avoid array size changes
    renderedMessages.map(m => m.state.type).join(',')
  ]);

  // Monitor specifically for thinking states
  useEffect(() => {
    const hasThinkingMessage = renderedMessages.some(m => m.state.type === 'thinking');
    const hasStreamingMessage = renderedMessages.some(m => m.state.type === 'streaming');
    
    // If a thinking or streaming message appears, scroll immediately
    if (hasThinkingMessage || hasStreamingMessage) {
      scrollToBottom();
      
      // Set up an interval to keep scrolling while in thinking/streaming state
      const intervalId = setInterval(scrollToBottom, 500);
      
      return () => clearInterval(intervalId);
    }
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

  const toggleThinking = (messageId) => {
    setExpandedThinking(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
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
    // Common JSON/graph delimiters
    const markers = [
      { start: "[GRAPH_START]", end: "[GRAPH_END]" },
      { start: "```vega-lite", end: "```" },
      { start: "```json", end: "```" },
      { start: "{", end: "}" }
    ];
    
    for (const marker of markers) {
      const startMarkerIndex = text.indexOf(marker.start, startIndex);
      if (startMarkerIndex !== -1) {
        let contentStart = startMarkerIndex + marker.start.length;
        
        // Skip to the actual content start
        if (marker.start === "```vega-lite" || marker.start === "```json") {
          const nextLineIndex = text.indexOf("\n", contentStart);
          if (nextLineIndex !== -1) {
            contentStart = nextLineIndex + 1;
          }
        }
        
        // For JSON objects, we need to find the matching closing brace
        if (marker.start === "{") {
          let openBraces = 1;
          let endMarkerIndex = contentStart;
          
          while (openBraces > 0 && endMarkerIndex < text.length) {
            endMarkerIndex++;
            if (text[endMarkerIndex] === "{") openBraces++;
            if (text[endMarkerIndex] === "}") openBraces--;
          }
          
          if (openBraces === 0) {
            const content = text.substring(startMarkerIndex, endMarkerIndex + 1);
            // Remove JavaScript-style comments if present
            let cleanedContent = content.replace(/\/\/.*$/gm, '');
            
            return {
              start: startMarkerIndex,
              end: endMarkerIndex + 1,
              contentStart: startMarkerIndex,
              contentEnd: endMarkerIndex + 1,
              content: cleanedContent,
              marker
            };
          }
        } else {
          // For code blocks and explicit markers, find the closing marker
          const endMarkerIndex = text.indexOf(marker.end, contentStart);
          if (endMarkerIndex !== -1) {
            // Extract the actual content without the markers
            const content = text.substring(contentStart, endMarkerIndex).trim();
            // Remove JavaScript-style comments if present
            let cleanedContent = content.replace(/\/\/.*$/gm, '');
            
            return {
              start: startMarkerIndex,
              end: endMarkerIndex + marker.end.length,
              contentStart,
              contentEnd: endMarkerIndex,
              content: cleanedContent,
              marker
            };
          }
        }
      }
    }
    
    return null;
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
    // Helper function to debug Vega-Lite specs
    const debugVegaLiteSpec = (spec) => {
      console.log("Attempting to parse Vega-Lite spec:");
      try {
        if (typeof spec === 'string') {
          // Try to clean the spec by removing comments
          const cleanedSpec = spec.replace(/\/\/.*$/gm, '');
          console.log("Cleaned spec (removed comments):", cleanedSpec.substring(0, 100) + "...");
          
          // Try to parse the cleaned spec
          const parsedSpec = JSON.parse(cleanedSpec);
          console.log("Successfully parsed spec. Structure:", {
            hasData: !!parsedSpec.data,
            dataFormat: parsedSpec.data ? Object.keys(parsedSpec.data) : [],
            hasMark: !!parsedSpec.mark,
            hasEncoding: !!parsedSpec.encoding,
          });
          return parsedSpec;
        } else {
          console.log("Spec is already an object:", {
            hasData: !!spec.data,
            dataFormat: spec.data ? Object.keys(spec.data) : [],
            hasMark: !!spec.mark,
            hasEncoding: !!spec.encoding,
          });
          return spec;
        }
      } catch (error) {
        console.error("Failed to parse spec:", error);
        return null;
      }
    };

    const blocks = [];
    let currentText = '';
    let index = 0;
    
    const addTextBlock = () => {
      if (currentText.trim()) {
        blocks.push({
          type: 'text',
          content: currentText.trim()
        });
      }
      currentText = '';
    };
    
    const preprocessJsonExpressions = (jsonString) => {
      // Remove any comments from the JSON string
      return jsonString.replace(/\/\/.*$/gm, '');
    };
    
    // First check for [GRAPH_START] and [GRAPH_END] markers
    const graphStartMarker = '[GRAPH_START]';
    const graphEndMarker = '[GRAPH_END]';
    
    while (index < content.length) {
      const graphStartIndex = content.indexOf(graphStartMarker, index);
      
      if (graphStartIndex === -1) {
        // No more graph markers, add the rest as text
        currentText += content.slice(index);
        break;
      }
      
      // Add text before the graph marker
      currentText += content.slice(index, graphStartIndex);
      addTextBlock();
      
      // Find the end of the graph
      const contentStart = graphStartIndex + graphStartMarker.length;
      const graphEndIndex = content.indexOf(graphEndMarker, contentStart);
      
      if (graphEndIndex === -1) {
        // No closing marker, treat the rest as text
        currentText += content.slice(graphStartIndex);
        break;
      }
      
      // Extract and clean the graph JSON
      const graphContent = content.slice(contentStart, graphEndIndex).trim();
      
      try {
        // Clean the JSON and parse it
        const cleanedContent = preprocessJsonExpressions(graphContent);
        const parsedGraph = JSON.parse(cleanedContent);
        
        // Debug the chart data
        debugVegaLiteSpec(parsedGraph);
        
        // Check if it looks like a valid Vega-Lite spec
        if (parsedGraph.data && (parsedGraph.mark || parsedGraph.layer) && parsedGraph.encoding) {
          blocks.push({
            type: 'vega-lite',
            content: parsedGraph
          });
        } else {
          // Not a valid chart, treat as text
          blocks.push({
            type: 'code',
            content: graphContent,
            language: 'json'
          });
        }
      } catch (e) {
        console.error("Error parsing graph JSON:", e);
        // Parsing failed, add as code block
        blocks.push({
          type: 'code',
          content: graphContent,
          language: 'json'
        });
      }
      
      // Move past the end marker
      index = graphEndIndex + graphEndMarker.length;
    }
    
    // Add any remaining text
    addTextBlock();
    
    // If no graph was found with explicit markers, fall back to other methods
    if (blocks.length === 0 || (blocks.length === 1 && blocks[0].type === 'text')) {
      // Existing code block parsing logic
      index = 0;
      blocks.length = 0;
      currentText = '';
      
      // Find code blocks
      while (index < content.length) {
        const codeMatch = content.indexOf('```', index);
        if (codeMatch === -1) break;
        
        // Add text before code block
        currentText += content.slice(index, codeMatch);
        addTextBlock();
        
        const codeEndMatch = content.indexOf('```', codeMatch + 3);
        if (codeEndMatch === -1) {
          // No closing code block found
          currentText += content.slice(codeMatch);
          break;
        }
        
        // Extract code block info
        const codeBlockStart = codeMatch + 3;
        const nextLine = content.indexOf('\n', codeBlockStart);
        const language = nextLine !== -1 
          ? content.slice(codeBlockStart, nextLine).trim() 
          : '';
        
        const codeContent = nextLine !== -1 
          ? content.slice(nextLine + 1, codeEndMatch).trim()
          : content.slice(codeBlockStart, codeEndMatch).trim();
        
        // Check if it's a chart/vega-lite specification
        if (language === 'json' || language === 'vega-lite') {
          try {
            // Clean JSON by removing comments
            const cleanedJson = preprocessJsonExpressions(codeContent);
            const chartData = JSON.parse(cleanedJson);
            
            // Debug the chart data
            debugVegaLiteSpec(chartData);
            
            // Check if it looks like a Vega-Lite spec
            if (chartData.data && chartData.mark && chartData.encoding) {
              blocks.push({
                type: 'vega-lite',
                content: chartData
              });
            } else {
              blocks.push({
                type: 'code',
                content: codeContent,
                language: language || 'json'
              });
            }
          } catch (e) {
            console.error("Error parsing JSON in code block:", e);
            blocks.push({
              type: 'code',
              content: codeContent,
              language: language || 'json'
            });
          }
        } else {
          blocks.push({
            type: 'code',
            content: codeContent,
            language: language || 'text'
          });
        }
        
        index = codeEndMatch + 3;
      }
      
      // Add remaining text
      if (index < content.length) {
        currentText += content.slice(index);
      }
      addTextBlock();
      
      // Scan for embedded JSON/charts in text blocks
      if (blocks.length > 0 && blocks[0].type === 'text') {
        const textContent = blocks[0].content;
        let graphIndex = 0;
        const processedBlocks = [];
        
        while (graphIndex < textContent.length) {
          const graph = findNextGraph(graphIndex, textContent);
          
          if (!graph) break;
          
          // Add text before the graph
          if (graph.start > graphIndex) {
            processedBlocks.push({
              type: 'text',
              content: textContent.slice(graphIndex, graph.start)
            });
          }
          
          // Try to parse the graph
          try {
            // Already cleaned in findNextGraph
            let chartData = JSON.parse(graph.content);
            
            // Debug the chart data
            debugVegaLiteSpec(chartData);
            
            if (chartData.data && (chartData.mark || chartData.layer) && chartData.encoding) {
              processedBlocks.push({
                type: 'vega-lite',
                content: chartData
              });
            } else {
              // Not a valid chart, treat as text
              processedBlocks.push({
                type: 'text',
                content: graph.content
              });
            }
          } catch (e) {
            console.error("Error parsing JSON in text block:", e);
            // Parsing failed, treat as text
            processedBlocks.push({
              type: 'text',
              content: graph.content
            });
          }
          
          graphIndex = graph.end;
        }
        
        // Add any remaining text
        if (graphIndex < textContent.length) {
          processedBlocks.push({
            type: 'text',
            content: textContent.slice(graphIndex)
          });
        }
        
        if (processedBlocks.length > 0) {
          blocks[0] = processedBlocks[0];
          if (processedBlocks.length > 1) {
            blocks.splice(1, 0, ...processedBlocks.slice(1));
          }
        }
      }
    }
    
    return blocks;
  };

  // Find the renderMessageContent function and replace it with:
  const renderMessageContent = (message) => {
    const { content, thinking, thinkingContent, isThinking, showThinking, usingTool } = message;
    // Extract downloadedFiles from message metadata if present
    const downloadedFiles = message.metadata?.downloadedFiles;

    // If the avatar is using a tool (like Google Maps), show the tool usage component
    if (usingTool) {
    return (
        <div className="message-content">
          <MCPToolUsage toolName={usingTool} isLoading={true} />
          </div>
      );
    }

    // Handle thinking state (existing code)
    if (isThinking) {
      return (
        <div className="message-content">
          <div className="thinking-indicator">
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
            </div>
          </div>
      );
    }

    if (!content.text) {
      console.log('Attempted to render null/undefined message text');
      return null;
    }

    const blocks = parseContentToBlocks(content.text);
    // Pass downloadedFiles to MessageContent component if present
    return <MessageContent blocks={blocks} downloadedFiles={downloadedFiles} />;
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
            id={`message-${message.id}`}
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
              className={`p-3 rounded-lg ${messageClasses} ${
                message.state.type === 'thinking' || message.state.type === 'streaming' 
                  ? 'w-full md:max-w-[85%]' // Wider for thinking/streaming states
                  : 'w-full md:max-w-[75%]' // Normal width for complete messages
              }`}
            >
              {message.metadata.isError ? (
                <p className="text-red-700">{message.content.text}</p>
              ) : message.state.type === 'thinking' ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="text-sm font-medium">
                    Thinking...
                  </div>
                  <div className="text-sm text-yellow-700">
                    {message.content.text || "Processing your request..."}
                  </div>
                  <div className="animate-pulse flex space-x-2 items-center">
                    <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                  </div>
                </div>
              ) : (
                renderMessageContent(message)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatWindow;