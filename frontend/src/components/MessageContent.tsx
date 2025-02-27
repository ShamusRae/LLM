import React, { useState, useEffect, useRef, useCallback } from 'react';
import vegaEmbed from 'vega-embed';
import MarkdownIt from 'markdown-it';
import { 
  FaFilePdf, 
  FaFileExcel, 
  FaFileWord, 
  FaFileAlt, 
  FaDownload,
  FaSync
} from 'react-icons/fa';

// Define interfaces for type safety
interface Block {
  type: 'text' | 'code' | 'vega-lite' | 'table';
  content: any;
  language?: string;
}

interface MessageContentProps {
  blocks: Block[];
  downloadedFiles?: any[];
}

interface ChartInfo {
  container: HTMLDivElement | null;
  spec: any;
  rendered: boolean;
  error: string | null;
  view: any;
  attempts: number;
}

interface TableData {
  columns: string[];
  rows: any[];
}

// Initialize markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

// Copy button component with TypeScript typing
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
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

// Helper function to validate Vega-Lite specs
const isValidVegaLiteSpec = (spec: any): boolean => {
  if (!spec || typeof spec !== 'object') return false;
  
  // Check if data is defined (inline, URL, or named data source)
  const hasData = spec.data || spec.url || (spec.datasets && Object.keys(spec.datasets).length > 0);
  if (!hasData) return false;
  
  // Check if mark is present or if it's a composite visualization
  const hasMark = spec.mark !== undefined;
  const isComposite = spec.layer || spec.hconcat || spec.vconcat || spec.facet;
  
  if (!hasMark && !isComposite) return false;
  
  // For compositional specs, check if they have valid components
  if (spec.layer && Array.isArray(spec.layer)) {
    return spec.layer.length > 0;
  }
  
  if (spec.hconcat && Array.isArray(spec.hconcat)) {
    return spec.hconcat.length > 0;
  }
  
  if (spec.vconcat && Array.isArray(spec.vconcat)) {
    return spec.vconcat.length > 0;
  }
  
  if (spec.facet && typeof spec.facet === 'object') {
    return !!spec.spec;
  }
  
  // Only proceed with mark validation if we have a mark
  if (hasMark) {
    // List of valid mark types
    const validMarkTypes = [
      'bar', 'line', 'area', 'point', 'tick', 'rect', 'circle', 'square',
      'rule', 'text', 'trail', 'arc', 'boxplot', 'errorband', 'errorbar',
      'geoshape', 'image', 'density'
    ];
    
    // Check if encoding is present for non-composite visualizations
    const hasEncoding = spec.encoding && Object.keys(spec.encoding).length > 0;
    if (!hasEncoding && !isComposite) {
      return false;
    }
    
    // Validate mark type
    if (typeof spec.mark === 'string') {
      return validMarkTypes.includes(spec.mark);
    } else if (typeof spec.mark === 'object' && spec.mark.type) {
      return validMarkTypes.includes(spec.mark.type);
    }
  }
  
  return false;
};

// Function to normalize Vega-Lite specs
const normalizeVegaLiteSpec = (spec: any): any => {
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
    
    // Ensure mark configs exist
    normalizedSpec.config.mark = normalizedSpec.config.mark || { tooltip: true };
    
    // Normalize mark format
    if (normalizedSpec.mark && typeof normalizedSpec.mark === 'string') {
      normalizedSpec.mark = { type: normalizedSpec.mark };
    }
    
    // Handle layer specs
    if (normalizedSpec.layer && Array.isArray(normalizedSpec.layer)) {
      normalizedSpec.layer = normalizedSpec.layer.map((layerSpec: any) => {
        if (layerSpec.mark && typeof layerSpec.mark === 'string') {
          return { ...layerSpec, mark: { type: layerSpec.mark } };
        }
        return layerSpec;
      });
    }
    
    return normalizedSpec;
  } catch (e) {
    console.error('Error normalizing Vega-Lite spec:', e);
    return null;
  }
};

// Create a fallback spec for error cases
const createFallbackSpec = (): any => {
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
      "x": {"field": "label", "type": "ordinal", "axis": {"title": ""}},
      "y": {"field": "value", "type": "quantitative", "axis": {"title": ""}},
      "color": {"value": "#cc0000"}
    },
    "background": "#f9f9f9"
  };
};

// Function to generate a consistent hash for strings
const generateHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36).replace('-', '_');
};

// Parse tables from markdown content
const parseTable = (tableText: string): TableData | null => {
  try {
    const lines = tableText.trim().split('\n');
    if (lines.length < 3) return null;
    
    // Check if it's a markdown table (has separator line)
    const headerLine = lines[0];
    const separatorLine = lines[1];
    
    if (!separatorLine.includes('|') || !separatorLine.includes('-')) {
      return null;
    }
    
    // Parse header
    const headerCells = headerLine
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
    
    // Parse rows
    const rows = lines.slice(2).map(line => {
      return line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
    });
    
    return {
      columns: headerCells,
      rows: rows
    };
  } catch (e) {
    console.error('Error parsing table:', e);
    return null;
  }
};

/**
 * Main MessageContent component that renders various block types
 */
const MessageContent: React.FC<MessageContentProps> = ({ blocks = [], downloadedFiles = [] }) => {
  // Store chart containers and their state
  const charts = useRef<Map<string, ChartInfo>>(new Map());
  // Track which charts have been rendered
  const [renderedChartIds, setRenderedChartIds] = useState<Set<string>>(new Set());
  // Store chart errors
  const [chartErrors, setChartErrors] = useState<Record<string, string>>({});
  // Track parsed tables
  const [parsedTables, setParsedTables] = useState<Record<string, TableData>>({});
  // Flag to indicate if message is fully loaded
  const [messageComplete, setMessageComplete] = useState<boolean>(false);
  
  // Analyze blocks for special content (tables, charts)
  useEffect(() => {
    // Parse tables from markdown blocks
    const newTables: Record<string, TableData> = {};
    
    blocks.forEach((block, blockIndex) => {
      if (block.type === 'text') {
        const content = block.content as string;
        
        // Look for markdown tables
        if (content.includes('|') && content.includes('\n')) {
          const tableMatches = content.match(/\|.*\|[\s\S]*?\|.*\|/g);
          
          if (tableMatches) {
            tableMatches.forEach((tableText, tableIndex) => {
              const tableData = parseTable(tableText);
              if (tableData) {
                const tableId = `table-${blockIndex}-${tableIndex}`;
                newTables[tableId] = tableData;
              }
            });
          }
        }
      }
    });
    
    setParsedTables(newTables);
    
    // Set message as complete after a short delay
    const timer = setTimeout(() => {
      setMessageComplete(true);
    }, 1000);
    
    // Reset message complete when blocks change significantly
    return () => {
      clearTimeout(timer);
      if (blocks.length === 0) {
        setMessageComplete(false);
      }
    };
  }, [blocks]);
  
  // Register a chart container ref
  const registerChartContainer = useCallback((el: HTMLDivElement | null, chartId: string, spec: any) => {
    if (el) {
      console.log(`Chart container mounted: ${chartId}`);
      const existingInfo = charts.current.get(chartId);
      charts.current.set(chartId, {
        container: el,
        spec,
        rendered: existingInfo?.rendered || false,
        error: existingInfo?.error || null,
        view: existingInfo?.view || null,
        attempts: (existingInfo?.attempts || 0)
      });
    }
  }, []);
  
  // Function to render a specific chart
  const renderChart = useCallback((chartId: string) => {
    const chartInfo = charts.current.get(chartId);
    
    if (!chartInfo || !chartInfo.container) {
      console.log(`Cannot render chart ${chartId}: container not available`);
      return;
    }
    
    if (chartInfo.rendered) {
      console.log(`Chart ${chartId} already rendered, skipping`);
      return;
    }
    
    // Increment attempt counter
    chartInfo.attempts += 1;
    
    // Skip if we've tried too many times
    if (chartInfo.attempts > 5) {
      console.warn(`Too many render attempts for chart ${chartId}, giving up`);
      setChartErrors(prev => ({...prev, [chartId]: 'Too many rendering attempts'}));
      return;
    }
    
    console.log(`Attempting to render chart ${chartId} (attempt ${chartInfo.attempts})`);
    
    // Parse and validate the spec
    let spec;
    try {
      const rawSpec = typeof chartInfo.spec === 'string' 
        ? JSON.parse(chartInfo.spec) 
        : chartInfo.spec;
      
      if (!isValidVegaLiteSpec(rawSpec)) {
        console.warn('Invalid Vega-Lite specification for chart', chartId);
        setChartErrors(prev => ({...prev, [chartId]: 'Invalid Vega-Lite specification'}));
        spec = createFallbackSpec();
      } else {
        spec = normalizeVegaLiteSpec(rawSpec);
      }
      
      if (!spec) {
        setChartErrors(prev => ({...prev, [chartId]: 'Failed to process chart specification'}));
        return;
      }
    } catch (error) {
      console.error(`Error processing chart ${chartId} spec:`, error);
      setChartErrors(prev => ({...prev, [chartId]: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`}));
      return;
    }
    
    // Clear container before rendering
    while (chartInfo.container.firstChild) {
      chartInfo.container.removeChild(chartInfo.container.firstChild);
    }
    
    // Reset error for this chart
    setChartErrors(prev => {
      const newErrors = {...prev};
      delete newErrors[chartId];
      return newErrors;
    });
    
    // Render the chart
    vegaEmbed(chartInfo.container, spec, {
      actions: true,
      theme: 'dark',
      renderer: 'canvas',
      defaultStyle: true,
      logLevel: 2,
      tooltip: true,
      config: {
        mark: { tooltip: true },
        axis: {
          labelFontSize: 11,
          titleFontSize: 13,
          titlePadding: 10
        },
        text: {
          fontSize: 11,
          font: 'sans-serif'
        },
        view: {
          stroke: null
        },
        title: {
          fontSize: 16,
          font: 'sans-serif'
        }
      }
    }).then(result => {
      // Update chart info
      chartInfo.rendered = true;
      chartInfo.view = result.view;
      charts.current.set(chartId, chartInfo);
      
      // Update rendered chart IDs to trigger re-render
      setRenderedChartIds(prev => {
        const newSet = new Set(prev);
        newSet.add(chartId);
        return newSet;
      });
      
      console.log(`Successfully rendered chart ${chartId}`);
      
      // Force resize after a short delay to ensure proper layout
      setTimeout(() => {
        if (result && result.view) {
          try {
            result.view.resize().run();
          } catch (e) {
            console.warn(`Failed to resize chart ${chartId}:`, e);
          }
        }
      }, 100);
    }).catch(error => {
      console.error(`Error embedding chart ${chartId}:`, error);
      
      // Update chart info
      chartInfo.error = error instanceof Error ? error.message : 'Unknown error';
      chartInfo.rendered = false;
      charts.current.set(chartId, chartInfo);
      
      // Update error state
      setChartErrors(prev => ({
        ...prev, 
        [chartId]: `Failed to render chart: ${chartInfo.error}`
      }));
      
      // Create an error message element
      const errorDiv = document.createElement('div');
      errorDiv.className = 'chart-error p-4 bg-red-50 text-red-700 border border-red-300 rounded';
      errorDiv.innerHTML = `
        <p class="font-bold">Failed to render chart: ${chartInfo.error}</p>
        <p class="text-sm mt-2">Try refreshing the chart or page.</p>
      `;
      
      // Clear container and add error message
      if (chartInfo.container) {
        while (chartInfo.container.firstChild) {
          chartInfo.container.removeChild(chartInfo.container.firstChild);
        }
        chartInfo.container.appendChild(errorDiv);
      }
    });
  }, []);
  
  // Effect to render charts when they become available
  useEffect(() => {
    const vegaBlocks = blocks.filter(block => block.type === 'vega-lite');
    
    // First pass: register all charts
    vegaBlocks.forEach((block, index) => {
      const contentString = typeof block.content === 'string' 
        ? block.content 
        : JSON.stringify(block.content);
      const contentHash = generateHash(contentString);
      const chartId = `chart-${index}-${contentHash}`;
      
      if (!charts.current.has(chartId)) {
        charts.current.set(chartId, {
          container: null,
          spec: block.content,
          rendered: false,
          error: null,
          view: null,
          attempts: 0
        });
      }
    });
    
    // Second pass: attempt to render charts that have containers
    for (const [chartId, chartInfo] of charts.current.entries()) {
      if (chartInfo.container && !chartInfo.rendered && !chartInfo.error) {
        renderChart(chartId);
      }
    }
    
    // On message completion, attempt to render any remaining unrendered charts
    if (messageComplete) {
      console.log('Message complete, checking for unrendered charts');
      for (const [chartId, chartInfo] of charts.current.entries()) {
        if (chartInfo.container && !chartInfo.rendered && chartInfo.attempts < 5) {
          console.log(`Message complete: attempting to render unrendered chart ${chartId}`);
          renderChart(chartId);
        }
      }
    }
    
    // Clean up chart views on unmount
    return () => {
      for (const [_, chartInfo] of charts.current.entries()) {
        if (chartInfo.view) {
          try {
            chartInfo.view.finalize();
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      }
    };
  }, [blocks, messageComplete, renderChart]);
  
  // Render text blocks (handling markdown)
  const renderText = (content: string): JSX.Element => (
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: md.render(content) }}
    />
  );
  
  // Render code blocks with syntax highlighting
  const renderCode = (content: string, language?: string): JSX.Element => (
    <div className="relative">
      <CopyButton text={content} />
      <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto my-4">
        <code className={language ? `language-${language}` : ''}>
          {content}
        </code>
      </pre>
    </div>
  );
  
  // Render a table
  const renderTable = (tableData: TableData): JSX.Element => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {tableData.columns.map((col, i) => (
              <th
                key={`col-${i}`}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tableData.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell: any, cellIndex: number) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
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
  
  // Render file attachments
  const renderFileAttachment = (file: any): JSX.Element => {
    const getFileIcon = () => {
      const extension = file.filename.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'pdf': return <FaFilePdf className="text-red-500" />;
        case 'xls': 
        case 'xlsx': return <FaFileExcel className="text-green-600" />;
        case 'doc':
        case 'docx': return <FaFileWord className="text-blue-600" />;
        default: return <FaFileAlt className="text-gray-500" />;
      }
    };
    
    return (
      <div className="mb-4 p-3 border rounded-md bg-gray-50 flex items-center">
        <div className="text-2xl mr-3">
          {getFileIcon()}
        </div>
        <div className="flex-grow">
          <div className="font-medium">{file.filename}</div>
          <div className="text-xs text-gray-500">
            {file.type || 'File'} • {(file.size / 1024).toFixed(2)} KB
          </div>
        </div>
        <a 
          href={`/api/files/download/${file.id}`}
          download={file.filename}
          className="p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          title="Download file"
        >
          <FaDownload />
        </a>
      </div>
    );
  };
  
  // Main render function
  return (
    <div className="message-content space-y-4">
      {blocks.map((block, index) => {
        // Generate content key for chart identification
        const contentString = typeof block.content === 'string' 
          ? block.content 
          : JSON.stringify(block.content);
        const contentHash = generateHash(contentString);
        const chartId = `chart-${index}-${contentHash}`;
        
        switch (block.type) {
          case 'text':
            return (
              <div key={`block-${index}`} className="text-block">
                {renderText(block.content)}
              </div>
            );
            
          case 'code':
            return (
              <div key={`block-${index}`} className="code-block">
                {renderCode(block.content, block.language)}
              </div>
            );
            
          case 'vega-lite':
            return (
              <div 
                key={`block-${index}-${contentHash}`} 
                className="chart-block my-4 p-4 rounded-lg border border-gray-200 bg-gray-50 relative"
              >
                {chartErrors[chartId] ? (
                  <div className="p-4 bg-red-50 text-red-700 border border-red-300 rounded mb-2">
                    <p className="font-bold">Chart Error: {chartErrors[chartId]}</p>
                    <p className="text-sm mt-2">
                      Try refreshing the chart with the button below.
                    </p>
                  </div>
                ) : null}
                
                <div className="flex justify-end space-x-2 mb-2">
                  <button
                    onClick={() => {
                      console.log(`Refreshing chart ${chartId}`);
                      // Mark as unrendered and reset attempts
                      const chartInfo = charts.current.get(chartId);
                      if (chartInfo) {
                        chartInfo.rendered = false;
                        chartInfo.attempts = 0;
                        charts.current.set(chartId, chartInfo);
                        
                        // Remove from rendered set
                        setRenderedChartIds(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(chartId);
                          return newSet;
                        });
                        
                        // Clear errors
                        setChartErrors(prev => {
                          const newErrors = {...prev};
                          delete newErrors[chartId];
                          return newErrors;
                        });
                        
                        // Trigger render
                        renderChart(chartId);
                      }
                    }}
                    className="p-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center"
                  >
                    <FaSync className="mr-1" /> Refresh Chart
                  </button>
                  <CopyButton 
                    text={typeof block.content === 'string' 
                      ? block.content 
                      : JSON.stringify(block.content, null, 2)} 
                  />
                </div>
                
                <div 
                  ref={el => registerChartContainer(el, chartId, block.content)}
                  data-chart-id={chartId}
                  data-chart-status={renderedChartIds.has(chartId) ? 'rendered' : 'pending'}
                  className="chart-container"
                  style={{ width: '100%', minHeight: '300px' }} 
                />
              </div>
            );
            
          case 'table':
            return (
              <div key={`block-${index}`} className="table-block">
                {renderTable(block.content)}
              </div>
            );
            
          default:
            return (
              <div key={`block-${index}`} className="unknown-block">
                Unknown block type: {block.type}
              </div>
            );
        }
      })}
      
      {/* Render downloaded files if any */}
      {downloadedFiles && downloadedFiles.length > 0 && (
        <div className="downloaded-files mt-4">
          <h3 className="text-sm font-medium mb-2">Downloaded Files:</h3>
          {downloadedFiles.map((file, index) => (
            <div key={`file-${index}`}>
              {renderFileAttachment(file)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageContent; 