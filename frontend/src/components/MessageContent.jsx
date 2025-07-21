import React, { useEffect, useRef, useState, useCallback } from 'react';
import MarkdownIt from 'markdown-it';
import vegaEmbed from 'vega-embed';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
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

const MessageContent = ({ blocks = [], downloadedFiles, isStreaming = false }) => {
  const chartContainers = useRef({});
  const [parsedTables, setParsedTables] = useState({});
  const [chartErrors, setChartErrors] = useState({});
  const [markdownTables, setMarkdownTables] = useState({});
  const [chartStatuses, setChartStatuses] = useState({});
  const [chartRenderingAttempted, setChartRenderingAttempted] = useState(false);
  const chartMetadataRef = useRef({
    // Map of actual vega-lite block indices
    actualChartIndices: [],
    // Track which charts have been processed
    processedCharts: new Set(),
    // Timestamp for chart ID generation
    creationTimestamp: Date.now()
  });
  
  // Find all vega-lite blocks and create a mapping system for them
  useEffect(() => {
    // Get actual indices of all vega-lite blocks
    const vegaLiteIndices = [];
    blocks.forEach((block, index) => {
      if (block.type === 'vega-lite') {
        vegaLiteIndices.push(index);
      }
    });
    
    console.log(`[Chart Debug] Found ${vegaLiteIndices.length} vega-lite blocks at indices:`, vegaLiteIndices);
    
    // If no charts, reset everything
    if (vegaLiteIndices.length === 0) {
      setChartStatuses({});
      chartContainers.current = {};
      chartMetadataRef.current = {
        actualChartIndices: [],
        processedCharts: new Set(),
        creationTimestamp: Date.now()
      };
      return;
    }
    
    // Check if chart indices have changed
    const currentIndices = chartMetadataRef.current.actualChartIndices;
    const indicesChanged = currentIndices.length !== vegaLiteIndices.length || 
      !currentIndices.every((val, idx) => val === vegaLiteIndices[idx]);
    
    // If indices changed, reset chart state
    if (indicesChanged) {
      console.log('[Chart Debug] Chart indices changed, resetting chart state');
      
      // Update indices
      chartMetadataRef.current.actualChartIndices = vegaLiteIndices;
      chartMetadataRef.current.processedCharts = new Set();
      
      // Reset rendering flag
      setChartRenderingAttempted(false);
      
      // Initialize statuses for all charts
      const initialStatuses = {};
      vegaLiteIndices.forEach((blockIndex, chartPosition) => {
        const chartId = getChartId(blockIndex);
        initialStatuses[chartId] = {
          status: 'waiting',
          blockIndex,
          position: chartPosition + 1 // 1-based position for display
        };
      });
      
      setChartStatuses(initialStatuses);
      
      // Clear container refs to avoid using stale references
      chartContainers.current = {};
    }
    
    return () => {
      // Clean up any resize handlers or other resources
      Object.values(chartStatuses).forEach(status => {
        if (status?.cleanup && typeof status.cleanup === 'function') {
          try {
            status.cleanup();
          } catch (e) {
            console.error('[Chart Debug] Error during cleanup:', e);
          }
        }
      });
    };
  }, [blocks]);
  
  // Get chart ID for a block index
  const getChartId = (blockIndex) => {
    return `chart-${chartMetadataRef.current.creationTimestamp}-${blockIndex}`;
  };
  
  // Convert block index to chart position (0 to N-1 -> 1 to N)
  const getChartPosition = (blockIndex) => {
    const position = chartMetadataRef.current.actualChartIndices.indexOf(blockIndex);
    return position >= 0 ? position + 1 : null;
  };
  
  // Get block index from chart position (1 to N -> actual block index)
  const getBlockIndexFromPosition = (position) => {
    // Convert from 1-based to 0-based
    const index = position - 1;
    if (index >= 0 && index < chartMetadataRef.current.actualChartIndices.length) {
      return chartMetadataRef.current.actualChartIndices[index];
    }
    return null;
  };
  
  // Store references to chart containers
  const setChartContainerRef = useCallback((element, blockIndex) => {
    if (element) {
      const chartId = getChartId(blockIndex);
      chartContainers.current[chartId] = element;
      
      const position = getChartPosition(blockIndex);
      console.log(`[Chart Debug] Container ref set for chart ${position} (block index: ${blockIndex}, ID: ${chartId})`);
    }
  }, []);
  
  // Render charts - only when streaming is complete or manually triggered
  useEffect(() => {
    // Skip if still streaming and not manually triggered
    if (isStreaming && !chartRenderingAttempted) {
      console.log('[Chart Debug] Still streaming, delaying chart rendering');
      return;
    }
    
    // Only proceed if we have chart indices
    const chartIndices = chartMetadataRef.current.actualChartIndices;
    if (chartIndices.length === 0) return;
    
    console.log(`[Chart Debug] Starting to render ${chartIndices.length} charts (streaming: ${isStreaming})`);
    
    // Track component mounted state
    let mounted = true;
    
    // Render a single chart
    const renderChart = async (chartPosition) => {
      if (!mounted) return;
      
      // Convert position to block index
      const blockIndex = getBlockIndexFromPosition(chartPosition);
      if (blockIndex === null) {
        console.error(`[Chart Debug] Invalid chart position ${chartPosition}`);
        return;
      }
      
      const chartId = getChartId(blockIndex);
      console.log(`[Chart Debug] Preparing to render chart ${chartPosition} (block index: ${blockIndex}, ID: ${chartId})`);
      
      // Check if this chart has already been processed
      if (chartMetadataRef.current.processedCharts.has(chartId)) {
        console.log(`[Chart Debug] Chart ${chartPosition} already processed, skipping`);
        return;
      }
      
      // Get container element
      const container = chartContainers.current[chartId];
      if (!container) {
        console.error(`[Chart Debug] Container not found for chart ${chartPosition} (block index: ${blockIndex})`);
        
        // Update status to error
        if (mounted) {
          setChartStatuses(prev => ({
            ...prev,
            [chartId]: {
              ...prev[chartId],
              status: 'error',
              message: 'Chart container not available',
              blockIndex,
              position: chartPosition
            }
          }));
        }
        return;
      }
      
      // Get the chart block
      const block = blocks.find((_, index) => index === blockIndex);
      if (!block || block.type !== 'vega-lite') {
        console.error(`[Chart Debug] Block at index ${blockIndex} is not a vega-lite block`);
        return;
      }
      
      // Update status to loading
      if (mounted) {
        setChartStatuses(prev => ({
          ...prev,
          [chartId]: {
            ...prev[chartId],
            status: 'loading',
            blockIndex,
            position: chartPosition
          }
        }));
      }
      
      try {
        // Parse the chart specification
        const content = block.content;
        const spec = typeof content === 'string' ? JSON.parse(content) : content;
        
        // Clear the container first
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        
        // Normalize the chart specification
        const normalizedSpec = normalizeVegaLiteSpec(spec);
        if (!normalizedSpec) {
          throw new Error('Failed to normalize chart specification');
        }
        
        // Set standard size and autosize properties
        normalizedSpec.width = normalizedSpec.width || 'container';
        normalizedSpec.height = normalizedSpec.height || 300;
        normalizedSpec.autosize = {
          type: 'fit',
          contains: 'padding'
        };
        
        // Add a small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 150 * (chartPosition - 1)));
        
        // Render the chart
        console.log(`[Chart Debug] Embedding chart ${chartPosition}`);
        const result = await vegaEmbed(container, normalizedSpec, {
          actions: true,
          renderer: 'svg',
          downloadFileName: `chart-${chartPosition}`,
          tooltip: true,
          config: {
            axis: { labelFontSize: 12, titleFontSize: 14 },
            legend: { labelFontSize: 12, titleFontSize: 14 },
            title: { fontSize: 16, subtitleFontSize: 14 },
            view: { continuousHeight: 300, continuousWidth: 400 }
          }
        });
        
        // Resize after initial render
        if (result && result.view) {
          await result.view.resize().runAsync();
          
          // Add resize handler
          const resizeHandler = () => {
            if (result && result.view) {
              try {
                result.view.resize().run();
              } catch (e) {
                console.warn(`[Chart Debug] Error resizing chart ${chartPosition}:`, e);
              }
            }
          };
          
          window.addEventListener('resize', resizeHandler);
          
          // Mark as processed
          chartMetadataRef.current.processedCharts.add(chartId);
          
          // Update status to rendered
          if (mounted) {
            setChartStatuses(prev => ({
              ...prev,
              [chartId]: {
                ...prev[chartId],
                status: 'rendered',
                cleanup: () => window.removeEventListener('resize', resizeHandler),
                blockIndex,
                position: chartPosition
              }
            }));
          } else {
            // Clean up if unmounted
            window.removeEventListener('resize', resizeHandler);
          }
          
          console.log(`[Chart Debug] Chart ${chartPosition} rendered successfully`);
        }
      } catch (error) {
        console.error(`[Chart Debug] Error rendering chart ${chartPosition}:`, error);
        
        if (mounted) {
          setChartStatuses(prev => ({
            ...prev,
            [chartId]: {
              ...prev[chartId],
              status: 'error',
              message: error.message || 'Unknown error rendering chart',
              blockIndex,
              position: chartPosition
            }
          }));
          
          // Try to render a fallback chart
          tryFallbackChart(container, blockIndex, chartPosition);
        }
      }
    };
    
    // Render a fallback chart
    const tryFallbackChart = async (container, blockIndex, chartPosition) => {
      if (!mounted || !container) return;
      
      const chartId = getChartId(blockIndex);
      
      try {
        console.log(`[Chart Debug] Attempting fallback for chart ${chartPosition}`);
        const fallbackSpec = createFallbackSpec();
        
        await vegaEmbed(container, fallbackSpec, {
          actions: false,
          renderer: 'svg',
          config: { 
            background: '#f8f9fa',
            text: { fontSize: 14 }
          }
        });
        
        // Mark as processed
        chartMetadataRef.current.processedCharts.add(chartId);
        
        if (mounted) {
          setChartStatuses(prev => ({
            ...prev,
            [chartId]: {
              ...prev[chartId],
              status: 'fallback',
              blockIndex,
              position: chartPosition
            }
          }));
        }
      } catch (e) {
        console.error(`[Chart Debug] Even fallback chart failed for ${chartPosition}:`, e);
      }
    };
    
    // Start rendering with a delay to ensure all containers are ready
    setTimeout(() => {
      if (!mounted) return;
      
      // Mark that we've attempted rendering
      setChartRenderingAttempted(true);
      
      // Get number of charts to render
      const chartCount = chartMetadataRef.current.actualChartIndices.length;
      
      // Render each chart with staggered timing, using position (1-based)
      for (let position = 1; position <= chartCount; position++) {
        setTimeout(() => {
          if (mounted) {
            renderChart(position);
          }
        }, (position - 1) * 300); // Stagger by position, not block index
      }
    }, 250);
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [blocks, isStreaming, chartRenderingAttempted]);

  // First preprocess blocks to handle any [GRAPH_START]/[GRAPH_END] markers in text blocks
  useEffect(() => {
    // Skip if no blocks
    if (!blocks || blocks.length === 0) return;
    
    // Check for any text blocks that might contain graph markers
    const graphRegex = /\[GRAPH_START\]([\s\S]*?)\[GRAPH_END\]/g;
    let foundEmbeddedGraphs = false;
    let extractedGraphSpecs = [];
    
    // Look through text blocks for embedded graphs and extract them
    blocks.forEach(block => {
      if (block.type === 'text' && typeof block.content === 'string') {
        const content = block.content;
        if (content.includes('[GRAPH_START]') && content.includes('[GRAPH_END]')) {
          foundEmbeddedGraphs = true;
          console.log('[Chart Debug] Found embedded graphs in text content');
          
          // Extract all graph specs
          let match;
          while ((match = graphRegex.exec(content)) !== null) {
            try {
              const graphSpec = match[1].trim();
              extractedGraphSpecs.push(graphSpec);
            } catch (e) {
              console.error('Error extracting graph spec:', e);
            }
          }
        }
      }
    });
    
    // If we found embedded graphs, process them
    if (foundEmbeddedGraphs && extractedGraphSpecs.length > 0) {
      console.log(`[Chart Debug] Extracted ${extractedGraphSpecs.length} embedded graph specs`);
      
      // We would add logic here to convert these extracted specs into proper vega-lite blocks
      // This is placeholder for future implementation
    }
  }, [blocks]);

  // Add a preprocessor for text with [GRAPH_START]/[GRAPH_END] markers
  const processGraphMarkersInText = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Check if the text contains graph markers
    if (!text.includes('[GRAPH_START]') || !text.includes('[GRAPH_END]')) {
      return text;
    }
    
    // Replace graph markers with a placeholder that will be displayed more nicely
    return text.replace(/\[GRAPH_START\]([\s\S]*?)\[GRAPH_END\]/g, 
      (match, graphContent) => {
        // Try to parse the graph content as JSON
        try {
          // Just validate it's proper JSON
          JSON.parse(graphContent.trim());
          return '[Graph visualization will appear here]';
        } catch (e) {
          console.error('Failed to parse graph content:', e);
          return '[Invalid graph specification]';
        }
      }
    );
  };

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

  // Enhanced parseTable function with graph marker detection
  const parseTable = (tableText) => {
    try {
      // Make sure we're working with a string
      if (typeof tableText !== 'string') {
        console.error('Table text is not a string:', tableText);
        return null;
      }
      
      // Check if this contains embedded graph markers
      if (tableText.includes('[GRAPH_START]') && tableText.includes('[GRAPH_END]')) {
        console.log('[Chart Debug] Found graph markers within table text, special handling needed');
        // Future enhancement: extract and process embedded graphs in tables
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

  // Modify renderText to handle graph markers
  const renderText = (content) => {
    // Preprocess content to handle graph markers
    const processedContent = processGraphMarkersInText(content);
    
    return (
      <div className="markdown-content mb-2">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
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
                
                return (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200 border">
                      {props.children}
                    </table>
                  </div>
                );
              } catch (error) {
                console.error('Error rendering table:', error);
                return <div className="text-red-500 p-2 border rounded">Error rendering table</div>;
              }
            },
            thead: ({node, ...props}) => (
              <thead className="bg-gray-50">
                {props.children}
              </thead>
            ),
            tbody: ({node, ...props}) => (
              <tbody className="bg-white divide-y divide-gray-200">
                {props.children}
              </tbody>
            ),
            tr: ({node, ...props}) => (
              <tr className="hover:bg-gray-50">
                {props.children}
              </tr>
            ),
            th: ({node, ...props}) => (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {props.children}
              </th>
            ),
            td: ({node, ...props}) => (
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {props.children}
              </td>
            ),
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
          {processedContent}
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
      {blocks.map((block, blockIndex) => {
        switch (block.type) {
          case 'text':
            return <div key={blockIndex}>{renderText(block.content)}</div>;
          case 'code':
            return <div key={blockIndex}>{renderCode(block.content, block.language)}</div>;
          case 'table':
            return <div key={blockIndex}>{renderTable(block.content)}</div>;
          case 'vega-lite': {
            const chartId = getChartId(blockIndex);
            const position = getChartPosition(blockIndex);
            
            // Skip if not a recognized chart position
            if (position === null) {
              console.warn(`[Chart Debug] Block ${blockIndex} is vega-lite but not in actualChartIndices`);
              return null;
            }
            
            const status = chartStatuses[chartId] || {
              status: 'waiting',
              blockIndex,
              position
            };
            
            return (
              <div key={`chart-wrapper-${chartId}`} className="my-4">
                <div 
                  className="chart-wrapper relative bg-white border border-gray-200 rounded-lg overflow-hidden"
                  data-chart-index={blockIndex}
                  data-chart-id={chartId}
                  data-chart-position={position}
                >
                  {/* Chart title & status */}
                  <div className="absolute top-0 right-0 bg-gray-100 text-xs text-gray-600 px-1 z-50">
                    Chart {position} - {status.status}
                  </div>
                  
                  {/* Chart container */}
                  <div
                    ref={el => setChartContainerRef(el, blockIndex)}
                    id={`chart-container-${chartId}`}
                    className="chart-container w-full p-4"
                    style={{ minHeight: '300px' }}
                  />
                  
                  {/* Loading indicator */}
                  {(status.status === 'loading' || status.status === 'waiting') && (
                    <div 
                      className="absolute top-0 left-0 right-0 bottom-0 bg-gray-50 bg-opacity-70 flex items-center justify-center"
                      style={{ zIndex: 5, pointerEvents: 'none' }}
                    >
                      <div className="text-sm font-medium text-gray-600 flex flex-col items-center p-2 bg-white rounded-md shadow-sm">
                        <div className="mb-2">
                          {status.status === 'loading' 
                            ? `Rendering chart ${position}...` 
                            : `Preparing chart ${position}...`}
                        </div>
                        <div className="loading-dots flex space-x-1">
                          <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Streaming mode indicator */}
                {isStreaming && !chartRenderingAttempted && (
                  <div className="mt-2 p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs flex items-center justify-between">
                    <span>Chart {position} will render when message is complete</span>
                    <button 
                      onClick={() => setChartRenderingAttempted(true)}
                      className="text-blue-600 hover:underline text-xs ml-2 px-2 py-1 rounded bg-white"
                    >
                      Render now
                    </button>
                  </div>
                )}
                
                {/* Error message */}
                {status.status === 'error' && status.message && (
                  <div className="mt-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
                    <div className="font-medium mb-1">Error rendering chart {position}:</div>
                    <div>{status.message}</div>
                    <button 
                      className="mt-2 text-blue-600 text-xs hover:underline focus:outline-none"
                      onClick={() => {
                        // Manual re-render for this specific chart
                        const container = chartContainers.current[chartId];
                        if (container) {
                          try {
                            // Update status to loading
                            setChartStatuses(prev => ({
                              ...prev,
                              [chartId]: {
                                ...prev[chartId],
                                status: 'loading'
                              }
                            }));
                            
                            // Clear container
                            while (container.firstChild) {
                              container.removeChild(container.firstChild);
                            }
                            
                            // Get the chart block
                            const block = blocks.find((_, index) => index === blockIndex);
                            if (!block || block.type !== 'vega-lite') {
                              throw new Error('Chart block not found');
                            }
                            
                            // Get and normalize the spec
                            const content = block.content;
                            const spec = typeof content === 'string' ? JSON.parse(content) : content;
                            const normalizedSpec = normalizeVegaLiteSpec(spec);
                            
                            // Remove from processed charts to allow re-rendering
                            chartMetadataRef.current.processedCharts.delete(chartId);
                            
                            // Render the chart
                            vegaEmbed(container, normalizedSpec, {
                              actions: true,
                              renderer: 'svg'
                            }).then(result => {
                              if (result && result.view) {
                                result.view.resize().runAsync().then(() => {
                                  // Mark as processed
                                  chartMetadataRef.current.processedCharts.add(chartId);
                                  
                                  setChartStatuses(prev => ({
                                    ...prev,
                                    [chartId]: {
                                      ...prev[chartId],
                                      status: 'rendered'
                                    }
                                  }));
                                });
                              }
                            }).catch(e => {
                              console.error(`[Chart Debug] Re-render failed for chart ${position}:`, e);
                              setChartStatuses(prev => ({
                                ...prev,
                                [chartId]: {
                                  ...prev[chartId],
                                  status: 'error',
                                  message: e.message
                                }
                              }));
                            });
                          } catch (e) {
                            console.error(`[Chart Debug] Error preparing re-render for chart ${position}:`, e);
                          }
                        }
                      }}
                    >
                      Try again
                    </button>
                  </div>
                )}
                
                {/* Fallback message */}
                {status.status === 'fallback' && (
                  <div className="mt-2 p-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs">
                    Simplified fallback chart shown for chart {position} due to rendering issues
                  </div>
                )}
              </div>
            );
          }
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