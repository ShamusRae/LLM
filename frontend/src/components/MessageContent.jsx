import React, { useEffect, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import vegaEmbed from 'vega-embed';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import { 
  FaFilePdf, 
  FaFileExcel, 
  FaFileWord, 
  FaFileAlt, 
  FaDownload 
} from 'react-icons/fa';

// Copy button component
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

// Initialize markdown parser
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

// Enhanced validation for Vega-Lite specs
const isValidVegaLiteSpec = (spec) => {
  // Basic validation
  if (!spec || typeof spec !== 'object') return false;
  
  // Check if data is defined (either inline or from a URL or named data source)
  const hasData = spec.data || spec.url || (spec.datasets && Object.keys(spec.datasets).length > 0);
  if (!hasData) return false;
  
  // Check if mark is present
  const hasMark = spec.mark !== undefined;
  if (!hasMark && !spec.layer && !spec.hconcat && !spec.vconcat && !spec.facet) {
    // No mark and no composite visualization
    return false;
  }
  
  // For compositional specs (layer, vconcat, hconcat), check if they have valid components
  if (spec.layer && Array.isArray(spec.layer)) {
    // It's a layered plot, which is valid without main mark
    if (spec.layer.length === 0) return false;
    return true;
  }
  
  if (spec.hconcat && Array.isArray(spec.hconcat)) {
    // It's a horizontal concatenation, which is valid without main mark
    if (spec.hconcat.length === 0) return false;
    return true;
  }
  
  if (spec.vconcat && Array.isArray(spec.vconcat)) {
    // It's a vertical concatenation, which is valid without main mark
    if (spec.vconcat.length === 0) return false;
    return true;
  }
  
  if (spec.facet && typeof spec.facet === 'object') {
    // It's a facet, which is valid without main mark if it has a spec
    return !!spec.spec;
  }
  
  // Only proceed with mark validation if we have a mark
  if (hasMark) {
    // List of valid mark types (from Vega-Lite documentation)
    const validMarkTypes = [
      'bar', 'line', 'area', 'point', 'tick', 'rect', 'circle', 'square',
      'rule', 'text', 'trail', 'arc', 'boxplot', 'errorband', 'errorbar',
      'geoshape', 'image', 'density'
    ];
    
    // Check if encoding is present (only required for non-composite visualizations)
    const hasEncoding = spec.encoding && Object.keys(spec.encoding).length > 0;
    if (!hasEncoding && !spec.layer && !spec.hconcat && !spec.vconcat && !spec.facet) {
      // Single mark must have encoding
      return false;
    }
    
    // Validate mark type
    if (typeof spec.mark === 'string') {
      return validMarkTypes.includes(spec.mark);
    } else if (typeof spec.mark === 'object' && spec.mark.type) {
      return validMarkTypes.includes(spec.mark.type);
    }
  }
  
  // There's something wrong with the mark specification
  return false;
};

// Safely normalize the spec
const normalizeVegaLiteSpec = (spec) => {
  try {
    // Create a deep copy to avoid modifying the original
    const normalizedSpec = JSON.parse(JSON.stringify(spec));
    
    // Ensure the schema is set correctly
    normalizedSpec.$schema = normalizedSpec.$schema || 'https://vega.github.io/schema/vega-lite/v5.json';
    
    // Basic sizing for better appearance
    normalizedSpec.width = normalizedSpec.width || 'container';
    normalizedSpec.autosize = normalizedSpec.autosize || { type: 'fit', contains: 'padding' };
    
    // Ensure config exists
    if (!normalizedSpec.config) {
      normalizedSpec.config = {};
    }
    
    // Ensure config.mark exists
    if (!normalizedSpec.config.mark) {
      normalizedSpec.config.mark = { tooltip: true };
    }
    
    // Initialize an empty config for all mark types to prevent undefined access
    const markTypes = [
      'bar', 'line', 'area', 'point', 'tick', 'rect', 'circle', 'square',
      'rule', 'text', 'trail', 'arc', 'boxplot', 'errorband', 'errorbar',
      'geoshape', 'image', 'density'
    ];
    
    markTypes.forEach(type => {
      if (!normalizedSpec.config[type]) {
        normalizedSpec.config[type] = {};
      }
    });
    
    // If it's a layered chart, normalize all layers
    if (normalizedSpec.layer && Array.isArray(normalizedSpec.layer)) {
      normalizedSpec.layer = normalizedSpec.layer.map(layerSpec => {
        // Normalize mark in each layer
        if (layerSpec.mark) {
          if (typeof layerSpec.mark === 'string') {
            layerSpec.mark = { type: layerSpec.mark };
          }
        }
        return layerSpec;
      });
    }
    
    // If it's a basic chart with a mark, normalize the mark
    if (normalizedSpec.mark) {
      // Convert string marks to objects
      if (typeof normalizedSpec.mark === 'string') {
        const markType = normalizedSpec.mark;
        normalizedSpec.mark = { type: markType };
      }
      
      // Ensure mark is an object with type
      if (!normalizedSpec.mark || typeof normalizedSpec.mark !== 'object') {
        normalizedSpec.mark = { type: 'bar' }; // Default fallback
      }
      
      // Ensure mark.type exists and is valid
      if (!normalizedSpec.mark.type) {
        normalizedSpec.mark.type = 'bar'; // Default fallback
      }
    }
    
    return normalizedSpec;
  } catch (e) {
    console.error('Error normalizing Vega-Lite spec:', e);
    return null;
  }
};

const createFallbackSpec = () => {
  // Create a simple bar chart as a guaranteed-to-work fallback
  return {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Fallback chart - Original specification had errors",
    "width": "container",
    "height": 200,
    "data": {
      "values": [
        {"label": "Error", "value": 1},
        {"label": "Info", "value": 2}
      ]
    },
    "mark": "bar",
    "encoding": {
      "x": {"field": "label", "type": "nominal", "axis": {"title": ""}},
      "y": {"field": "value", "type": "quantitative", "axis": {"title": ""}},
      "color": {"value": "#cc0000"}
    },
    "background": "#f9f9f9"
  };
};

const MessageContent = ({ blocks = [], downloadedFiles }) => {
  const chartContainers = useRef({});
  const [parsedTables, setParsedTables] = useState({});
  // Track which charts have already been rendered to prevent re-rendering on state change
  const renderedCharts = useRef(new Set());
  // Keep track of chart errors to display custom error messages
  const [chartErrors, setChartErrors] = useState({});
  // Track embedded tables found in markdown content
  const [markdownTables, setMarkdownTables] = useState({});
  // Add state to detect when message is fully loaded
  const [messageComplete, setMessageComplete] = useState(false);
  // Add a ref to track rendering attempts
  const renderAttempts = useRef({});
  // Add a ref to store timers for cleanup
  const timersRef = useRef([]);

  // First useEffect - handle Vega-Lite charts
  useEffect(() => {
    // Handle Vega-Lite visualizations
    const vegaBlocks = blocks.filter(block => block.type === 'vega-lite');
    
    // Track if any charts were attempted to be rendered in this effect run
    let chartsAttempted = false;
    let successfulRenders = 0;
    
    vegaBlocks.forEach((block, index) => {
      // Generate a unique ID for this chart based on its content and index
      // Adding more uniqueness with JSON.stringify of the whole content, not just length
      const contentString = typeof block.content === 'string' 
        ? block.content 
        : JSON.stringify(block.content);
      const contentHash = contentString.length + '-' + (contentString.length > 20 ? 
        contentString.substring(0, 10) + contentString.substring(contentString.length - 10) : contentString);
      const chartId = `chart-${index}-${contentHash}`;
      const container = chartContainers.current[index];
      
      chartsAttempted = true;
      
      // Skip if container doesn't exist
      if (!container) {
        console.log(`Container for chart ${index} doesn't exist, skipping`);
        return;
      }
      
      // Initialize or increment render attempts counter
      renderAttempts.current[chartId] = (renderAttempts.current[chartId] || 0) + 1;
      
      // Check if we already rendered this exact chart AND the container has vega content
      const hasVegaContent = container.querySelector('.vega-embed') || container.querySelector('.marks');
      if (renderedCharts.current.has(chartId) && hasVegaContent) {
        console.log(`Chart ${chartId} already rendered, skipping (attempt ${renderAttempts.current[chartId]})`);
        return;
      }

      // If we've tried too many times for this chart, skip to avoid infinite loops
      if (renderAttempts.current[chartId] > 10) {
        console.warn(`Too many render attempts for chart ${chartId}, giving up`);
        return;
      }

      console.log(`Attempting to render chart ${index} with ID ${chartId} (attempt ${renderAttempts.current[chartId]})`);
      
      // Parse the spec
      let rawSpec;
      try {
        rawSpec = typeof block.content === 'string' 
          ? JSON.parse(block.content) 
          : block.content;
      } catch (e) {
        console.error('Failed to parse Vega-Lite spec:', e);
        setChartErrors(prev => ({...prev, [index]: 'Invalid JSON in chart specification'}));
        return;
      }

      // Validate the Vega-Lite spec
      if (!isValidVegaLiteSpec(rawSpec)) {
        console.warn('Invalid Vega-Lite specification', rawSpec);
        setChartErrors(prev => ({...prev, [index]: 'Invalid Vega-Lite specification format'}));
        
        // Try to render with the fallback spec
        rawSpec = createFallbackSpec();
      }

      // Normalize the spec to prevent errors
      const spec = normalizeVegaLiteSpec(rawSpec);
      if (!spec) {
        setChartErrors(prev => ({...prev, [index]: 'Failed to normalize chart specification'}));
        return;
      }

      console.log(`Rendering chart ${chartId}`, spec);
      
      // Always clear container before rendering to avoid stale content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Reset error for this chart
      setChartErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[index];
        return newErrors;
      });

      // Embed chart with better error handling
      vegaEmbed(container, spec, {
        actions: true,
        theme: 'dark',
        renderer: 'canvas',
        defaultStyle: true, // Use default styles to avoid missing CSS
        logLevel: 2, // Show warnings
        tooltip: true, // Enable tooltips
        config: {
          // Add a base config to ensure all mark types have default values
          mark: { tooltip: true },
          bar: { fill: '#4C78A8' },
          line: { stroke: '#4C78A8' },
          area: { fill: '#4C78A8' },
          point: { filled: true, size: 60 },
          rect: { fill: '#4C78A8' },
          // Add sensible defaults for all mark types
          axis: {
            labelFontSize: 11,
            titleFontSize: 13,
            titlePadding: 10
          },
          // Better fonts for text
          text: {
            fontSize: 11,
            font: 'sans-serif'
          },
          // Enable tooltips globally
          view: {
            stroke: null
          },
          // Ensure titles are readable
          title: {
            fontSize: 16,
            font: 'sans-serif'
          }
        }
      }).then(result => {
        // Mark this chart as rendered
        renderedCharts.current.add(chartId);
        successfulRenders++;
        console.log(`Successfully rendered chart ${chartId} (${successfulRenders}/${vegaBlocks.length} charts rendered)`);
        
        // Force a small timeout and re-render to ensure the chart is properly sized
        setTimeout(() => {
          if (result && result.view) {
            try {
              result.view.resize().run();
              console.log(`Chart ${chartId} resized and re-run`);
            } catch (e) {
              console.warn(`Failed to resize chart ${chartId}:`, e);
            }
          }
        }, 100);
      }).catch(error => {
        console.error('Error embedding chart:', error);
        console.error('Problematic spec:', JSON.stringify(spec, null, 2));
        
        // More detailed error logging to help identify issues
        if (spec.mark) {
          console.error(`Mark type: ${typeof spec.mark === 'string' ? spec.mark : spec.mark.type}`);
        }
        if (spec.encoding) {
          console.error(`Encoding channels: ${Object.keys(spec.encoding).join(', ')}`);
        }
        if (spec.config) {
          console.error(`Config keys: ${Object.keys(spec.config).join(', ')}`);
        }
        
        setChartErrors(prev => ({
          ...prev, 
          [index]: `Failed to render chart: ${error.message}`
        }));
        
        // Create an error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error p-4 bg-red-50 text-red-700 border border-red-300 rounded';
        errorDiv.innerHTML = `
          <p class="font-bold">Failed to render chart: ${error.message}</p>
          <p class="text-sm mt-2">Try refreshing the page or contact support if the issue persists.</p>
        `;
        
        // Clear container and add error message
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(errorDiv);
      });
    });

    // After processing all charts, check if all were rendered successfully
    if (vegaBlocks.length > 0) {
      // Schedule a short timeout to allow any async rendering to complete
      setTimeout(() => {
        // Count how many charts appear to be rendered
        const renderedCount = vegaBlocks.reduce((count, _, index) => {
          const container = chartContainers.current[index];
          const hasVegaContent = container && (container.querySelector('.vega-embed') || container.querySelector('.marks'));
          return hasVegaContent ? count + 1 : count;
        }, 0);
        
        console.log(`Chart rendering summary: ${renderedCount}/${vegaBlocks.length} charts appear to be rendered`);
        
        // If all charts are rendered, trigger a final resize
        if (renderedCount === vegaBlocks.length) {
          console.log('All charts rendered, performing final resize');
          vegaBlocks.forEach((_, index) => {
            const container = chartContainers.current[index];
            if (container) {
              const vegaView = container.querySelector('.vega-embed')?.querySelector('.marks');
              if (vegaView) {
                // Try to access the Vega view to trigger resize
                try {
                  const vegaChart = vegaView.__view__;
                  if (vegaChart && vegaChart.resize) {
                    vegaChart.resize().run();
                  }
                } catch (e) {
                  // Ignore errors accessing the view
                }
              }
            }
          });
        }
      }, 200);
    }

    // If we had chart blocks but no rendering was attempted, schedule a re-render
    // This helps when containers aren't ready yet but we have chart data
    if (vegaBlocks.length > 0 && !chartsAttempted) {
      const reRenderTimer = setTimeout(() => {
        console.log('Scheduling chart re-render attempt');
        // Force re-render by creating a new ref
        chartContainers.current = { ...chartContainers.current };
      }, 500);
      
      // Store the timer for cleanup
      timersRef.current.push(reRenderTimer);
    }

    // Cleanup function for all timers
    return () => {
      // Clear all timers
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
      
      // Only clear rendered charts when component unmounts
      if (blocks.length === 0) {
        renderedCharts.current.clear();
      }
    };
  }, [blocks]);

  // New useEffect to handle rendering charts after message is complete
  useEffect(() => {
    // Only run once per block update
    if (!messageComplete) {
      // Mark message as complete after a delay
      const timer = setTimeout(() => {
        setMessageComplete(true);
        console.log('Message marked as complete, checking for unrendered charts');
        
        // Force a re-render attempt of all charts
        const vegaBlocks = blocks.filter(block => block.type === 'vega-lite');
        if (vegaBlocks.length > 0) {
          console.log(`Attempting to render ${vegaBlocks.length} charts after completion`);
          
          // Force a more aggressive re-render of all charts
          vegaBlocks.forEach((block, index) => {
            // Generate chart ID similar to the main useEffect
            const contentString = typeof block.content === 'string' 
              ? block.content 
              : JSON.stringify(block.content);
            const contentHash = contentString.length + '-' + (contentString.length > 20 ? 
              contentString.substring(0, 10) + contentString.substring(contentString.length - 10) : contentString);
            const chartId = `chart-${index}-${contentHash}`;
            
            // Check if this chart's container exists but chart hasn't been rendered
            const container = chartContainers.current[index];
            const hasVegaContent = container && (container.querySelector('.vega-embed') || container.querySelector('.marks'));
            
            if (container && !hasVegaContent) {
              console.log(`Chart completion: Container for chart ${index} exists but no chart rendered yet`);
              
              // Clear any previous rendered status for this chart to force re-render
              renderedCharts.current.delete(chartId);
              
              // Clear container to ensure fresh rendering
              if (container) {
                while (container.firstChild) {
                  container.removeChild(container.firstChild);
                }
              }
            }
          });
          
          // Create a new ref object to trigger the chart rendering useEffect
          chartContainers.current = { ...chartContainers.current };
          
          // Schedule another check in case not all charts are rendered
          setTimeout(() => {
            // Count unrendered charts
            let unrenderedCount = 0;
            vegaBlocks.forEach((_, index) => {
              const container = chartContainers.current[index];
              const hasVegaContent = container && (container.querySelector('.vega-embed') || container.querySelector('.marks'));
              if (container && !hasVegaContent) {
                unrenderedCount++;
              }
            });
            
            if (unrenderedCount > 0) {
              console.log(`Still have ${unrenderedCount} unrendered charts, triggering another render cycle`);
              // Force one more refresh cycle
              chartContainers.current = { ...chartContainers.current };
            }
          }, 1500);
        }
      }, 1000); // Wait 1 second after blocks update to consider message "complete"
      
      return () => clearTimeout(timer);
    }
  }, [blocks, messageComplete]);

  // Reset messageComplete when blocks change significantly
  useEffect(() => {
    setMessageComplete(false);
  }, [blocks.length]);

  // Second useEffect - find and extract tables from text content
  useEffect(() => {
    // Look for text blocks that might contain tables
    const textBlocks = blocks.filter(block => block.type === 'text');
    
    // Process each text block to find potential tables
    const foundTables = {};
    
    textBlocks.forEach((block, blockIndex) => {
      if (typeof block.content !== 'string') return;
      
      // Basic check for markdown table format (contains | and --- patterns)
      if (block.content.includes('|') && block.content.includes('---')) {
        // Split by lines to find table sections
        const lines = block.content.split('\n');
        let tableStart = -1;
        
        // Find table start (a line with | followed by a line with |---)
        for (let i = 0; i < lines.length - 1; i++) {
          if (lines[i].includes('|') && lines[i+1].includes('|') && lines[i+1].includes('---')) {
            tableStart = i;
            break;
          }
        }
        
        if (tableStart >= 0) {
          // Extract table content
          let tableEnd = tableStart + 1;
          while (tableEnd < lines.length && lines[tableEnd].includes('|')) {
            tableEnd++;
          }
          
          // Create a unique key for this table
          const tableContent = lines.slice(tableStart, tableEnd).join('\n');
          const tableKey = `table-${blockIndex}-${tableContent.length}`;
          
          // Parse the table
          const parsedTable = parseTable(tableContent);
          if (parsedTable) {
            foundTables[tableKey] = parsedTable;
          }
        }
      }
    });
    
    // Update state with found tables
    setMarkdownTables(foundTables);
  }, [blocks]);

  const parseTable = (tableText) => {
    try {
      // Make sure we're working with a string
      if (typeof tableText !== 'string') {
        console.error('Table text is not a string:', tableText);
        return null;
      }
      
      // Split into lines and remove any empty lines
      const lines = tableText.split('\n').filter(line => line.trim().length > 0);
      if (lines.length < 3) {
        console.error('Table needs at least header, separator, and data row');
        return null;
      }
      
      // Extract headers from the first row
      const headerLine = lines[0].trim();
      if (!headerLine.includes('|')) {
        console.error('Invalid table format: no column separators in header');
        return null;
      }
      
      // Check if second row is a separator (common in Markdown tables)
      const secondLine = lines[1].trim();
      if (!secondLine.includes('|') || !secondLine.includes('-')) {
        console.error('Invalid table format: separator row not found');
        return null;
      }
      
      // Parse headers
      let headers = headerLine.split('|').map(h => h.trim());
      // If the table starts or ends with |, remove the empty first/last elements
      if (headers[0] === '') headers.shift();
      if (headers[headers.length - 1] === '') headers.pop();
      
      // Find where data rows start (usually after the separator row)
      const dataStartIndex = 2;
      
      // Parse data rows
      const rows = [];
      for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.includes('|')) continue;
        
        let cells = line.split('|').map(cell => cell.trim());
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();
        
        // Make sure each row has the same number of cells as headers
        while (cells.length < headers.length) cells.push('');
        if (cells.length > headers.length) cells = cells.slice(0, headers.length);
        
        rows.push(cells);
      }
      
      return { headers, rows };
    } catch (error) {
      console.error('Error parsing table:', error);
      return null;
    }
  };

  const MarkdownTable = ({ children }) => {
    // Sometimes the entire markdown string is passed, not just the table
    const tableText = typeof children === 'string' ? children : '';
    
    // Unique ID for the table
    const tableId = `table-${tableText.length}`;
    
    // If we already parsed this table, use the cached result
    if (!parsedTables[tableId] && tableText) {
      const parsedTable = parseTable(tableText);
      if (parsedTable) {
        setParsedTables(prev => ({ ...prev, [tableId]: parsedTable }));
      } else {
        console.error('Failed to parse table:', tableText);
      }
    }
    
    const table = parsedTables[tableId];
    if (!table) {
      // Improved fallback handling - try to salvage what we can from the raw markup
      try {
        if (tableText && tableText.includes('|')) {
          // Very basic fallback - split by lines and render in a pre tag
          return (
            <div className="overflow-x-auto my-4 border border-gray-300 rounded p-2">
              <pre className="whitespace-pre-wrap">{tableText}</pre>
            </div>
          );
        }
        
        // If we can't identify table structure, show an error
        return (
          <div className="p-3 border border-yellow-300 bg-yellow-50 rounded my-3 text-yellow-700">
            <p>Failed to parse table format</p>
            {tableText && <pre className="mt-2 text-xs overflow-auto max-h-24">{tableText.substring(0, 150)}...</pre>}
          </div>
        );
      } catch (e) {
        console.error('Error in table fallback rendering:', e);
        return <div className="text-red-500 p-2">Error rendering table content</div>;
      }
    }
    
    // Regular table rendering when parsing succeeds
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {table.headers.map((header, i) => (
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
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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

  const renderText = (content) => {
    // Function to log graph json for debugging
    const logGraph = (graphObj) => {
      console.log('Graph JSON structure:', {
        hasData: !!graphObj.data,
        hasEncoding: !!graphObj.encoding,
        markType: typeof graphObj.mark === 'string' ? graphObj.mark : (graphObj.mark?.type || 'unknown'),
        config: graphObj.config || 'none'
      });
      return graphObj;
    };

    return (
      <div className="markdown-content mb-2">
        <ReactMarkdown 
          rehypePlugins={[rehypeRaw]} 
          components={{
            table: ({ node, ...props }) => {
              try {
                // Extract the table content
                const tableContent = (props.children || [])
                  .map(child => {
                    if (typeof child === 'string') return child;
                    if (child && child.props && Array.isArray(child.props.children)) {
                      return child.props.children
                        .map(c => {
                          if (typeof c === 'string') return c;
                          if (c && c.props && Array.isArray(c.props.children)) {
                            return c.props.children.map(cc => 
                              typeof cc === 'string' ? cc : ''
                            ).join('');
                          }
                          return '';
                        })
                        .join('\n');
                    }
                    return '';
                  })
                  .filter(Boolean)
                  .join('\n');
                
                // Generate a unique ID for the table
                const tableId = `md-table-${tableContent.length}`;
                
                // Parse the table content if we haven't already
                if (!parsedTables[tableId] && tableContent) {
                  const parsed = parseTable(tableContent);
                  if (parsed) {
                    // Update state in a non-blocking way
                    setTimeout(() => {
                      setParsedTables(prev => ({
                        ...prev,
                        [tableId]: parsed
                      }));
                    }, 0);
                  }
                }
                
                // If we already have the parsed table, render it
                if (parsedTables[tableId]) {
                  return (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {parsedTables[tableId].headers.map((header, i) => (
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
                          {parsedTables[tableId].rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                
                // Fall back to original table if parsing failed
                return <MarkdownTable>{tableContent}</MarkdownTable>;
              } catch (error) {
                console.error('Error rendering table:', error);
                return <div className="text-red-500 p-2 border rounded">Error rendering table</div>;
              }
            },
            code: ({ node, inline, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="rounded"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const renderCode = (content, language) => (
    <div className="relative">
      <CopyButton text={content} />
      <SyntaxHighlighter
        language={language || 'javascript'}
        style={vscDarkPlus}
        className="rounded"
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );

  const renderFileAttachment = (file) => {
    let icon;
    switch (file.type?.toLowerCase()) {
      case 'application/pdf':
        icon = <FaFilePdf className="text-red-500" />;
        break;
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        icon = <FaFileExcel className="text-green-500" />;
        break;
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        icon = <FaFileWord className="text-blue-500" />;
        break;
      default:
        icon = <FaFileAlt className="text-gray-500" />;
    }

    return (
      <div key={file.id} className="flex items-center gap-3 p-2 border rounded mb-2">
        <div className="text-xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.filename}</p>
          <p className="text-sm text-gray-500">{file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}</p>
        </div>
        <a 
          href={`/api/file/download/${file.id}`} 
          download={file.filename}
          className="ml-2 p-2 text-blue-600 hover:text-blue-800"
          title="Download file"
        >
          <FaDownload />
        </a>
      </div>
    );
  };

  const renderTable = (tableContent) => {
    if (!tableContent) {
      return <div className="p-3 text-yellow-700">No table content provided</div>;
    }

    // Generate a unique ID for this table based on content
    const tableId = `table-${tableContent.length}`;
    
    // If we already parsed this table, use the cached result
    if (!parsedTables[tableId] && tableContent) {
      const parsedTable = parseTable(tableContent);
      if (parsedTable) {
        setParsedTables(prev => ({ ...prev, [tableId]: parsedTable }));
      } else {
        console.error('Failed to parse table:', tableContent);
      }
    }
    
    const table = parsedTables[tableId];
    if (!table) {
      // Improved fallback handling - try to salvage what we can from the raw markup
      try {
        if (tableContent && tableContent.includes('|')) {
          // Very basic fallback - split by lines and render in a pre tag
          return (
            <div className="overflow-x-auto my-4 border border-gray-300 rounded p-2">
              <pre className="whitespace-pre-wrap">{tableContent}</pre>
            </div>
          );
        }
        
        // If we can't identify table structure, show an error
        return (
          <div className="p-3 border border-yellow-300 bg-yellow-50 rounded my-3 text-yellow-700">
            <p>Failed to parse table format</p>
            {tableContent && <pre className="mt-2 text-xs overflow-auto max-h-24">{tableContent.substring(0, 150)}...</pre>}
          </div>
        );
      } catch (e) {
        console.error('Error in table fallback rendering:', e);
        return <div className="text-red-500 p-2">Error rendering table content</div>;
      }
    }
    
    // Regular table rendering when parsing succeeds
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {table.headers.map((header, i) => (
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
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
  
  return (
    <div className="message-blocks">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'text':
            return <div key={index}>{renderText(block.content)}</div>;
          case 'code':
            return <div key={index}>{renderCode(block.content, block.language)}</div>;
          case 'table':
            return <div key={index}>{renderTable(block.content)}</div>;
          case 'vega-lite':
            // Create unique key based on content hash to force re-mount when content truly changes
            const contentString = typeof block.content === 'string' 
              ? block.content 
              : JSON.stringify(block.content);
            const contentKey = contentString.length + '-' + (contentString.length > 20 
              ? contentString.substring(0, 10) + contentString.substring(contentString.length - 10) 
              : contentString);
            
            // Determine if this is a chart that needs rendering
            const chartId = `chart-${index}-${contentKey}`;
            const isRendered = renderedCharts.current.has(chartId);
            
            return (
              <div key={`chart-${index}-${contentKey}`} className="my-3">
                <div
                  ref={el => {
                    if (el && !chartContainers.current[index]) {
                      console.log(`Setting up container for chart ${index}`);
                    }
                    chartContainers.current[index] = el;
                  }}
                  className="chart-container relative border border-gray-200 rounded-lg overflow-hidden"
                  style={{ minHeight: '250px', width: '100%' }}
                  data-testid="chart-container"
                  data-chart-index={index}
                  data-chart-id={chartId}
                  data-chart-status={isRendered ? 'rendered' : 'pending'}
                />
                {chartErrors[index] && (
                  <div className="mt-2 p-3 bg-red-50 text-red-700 border border-red-300 rounded text-sm">
                    {chartErrors[index]}
                  </div>
                )}
                {typeof block.content === 'string' && block.content.length > 0 && (
                  <div className="text-xs mt-2 text-gray-500">
                    <div className="flex justify-between">
                      <span>Chart data: {block.content.length} characters</span>
                      <button 
                        className="text-blue-500 hover:text-blue-700 text-xs"
                        onClick={() => {
                          try {
                            // Force re-render this specific chart
                            const chartKey = `chart-${index}-${contentKey}`;
                            console.log(`User requested re-render of chart ${chartKey}`);
                            renderedCharts.current.delete(chartKey);
                            // Create a shallow copy to trigger re-render
                            const currentContainer = chartContainers.current[index];
                            if (currentContainer) {
                              while (currentContainer.firstChild) {
                                currentContainer.removeChild(currentContainer.firstChild);
                              }
                            }
                            // Force useEffect to run again
                            chartContainers.current = { ...chartContainers.current };
                          } catch (e) {
                            console.error('Error refreshing chart:', e);
                          }
                        }}
                      >
                        Refresh Chart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          default:
            return null;
        }
      })}
      
      {/* Render downloaded files if present */}
      {downloadedFiles && downloadedFiles.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="font-medium text-gray-700 mb-2">Downloaded Files:</p>
          {downloadedFiles.map(file => renderFileAttachment(file))}
        </div>
      )}
    </div>
  );
};

export default MessageContent; 