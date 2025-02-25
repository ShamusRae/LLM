import React, { useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import vegaEmbed from 'vega-embed';

// Initialize markdown parser
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

// Validate if an object is a proper Vega-Lite spec
const isValidVegaLiteSpec = (spec) => {
  // Basic structure validation
  if (!spec || typeof spec !== 'object') return false;
  
  // Must have either data, datasets, or url
  if (!spec.data && !spec.datasets && !spec.url) return false;
  
  // Must have mark or layer or marks
  if (!spec.mark && !spec.layer && !spec.marks) return false;
  
  // Sanitize the data values if they exist and contain expressions
  if (spec.data && spec.data.values && Array.isArray(spec.data.values)) {
    try {
      // Look for any JavaScript expressions in the data values
      spec.data.values = spec.data.values.map(item => {
        if (item && typeof item === 'object') {
          const sanitizedItem = {};
          // For each property in the data item
          Object.keys(item).forEach(key => {
            const value = item[key];
            // If the value is a string containing an expression
            if (typeof value === 'string' && 
                (value.includes('+') || value.includes('*') || 
                 value.includes('/') || value.includes('-'))) {
              try {
                // Only evaluate if it looks like a numeric expression
                if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(value)) {
                  sanitizedItem[key] = eval(value);
                } else {
                  sanitizedItem[key] = value;
                }
              } catch (e) {
                sanitizedItem[key] = value;
              }
            } else {
              sanitizedItem[key] = value;
            }
          });
          return sanitizedItem;
        }
        return item;
      });
    } catch (error) {
      console.warn('Error sanitizing data values:', error);
    }
  }
  
  // If using mark and encoding, validate basic structure
  if (spec.mark && spec.encoding) {
    // Make sure mark has a type if it's an object
    if (typeof spec.mark === 'object' && !spec.mark.type) {
      // Fix mark object by adding default type
      spec.mark.type = 'point';
    }
    
    return true;
  }
  
  // If it's a layered or multi-view spec, do basic validation
  if (spec.layer || spec.hconcat || spec.vconcat || spec.facet) {
    return true;
  }
  
  // For Vega specs (more complex)
  if (spec.marks && Array.isArray(spec.marks)) {
    return true;
  }
  
  return false;
};

// Add a backup minimal spec when validation fails
const createFallbackSpec = (content) => {
  // Create a simple text notice as a Vega spec
  return {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Fallback chart - Original specification had errors",
    "width": 300,
    "height": 200,
    "data": {
      "values": [{"x": 1, "y": 1}]
    },
    "mark": "text",
    "encoding": {
      "text": {"value": "Invalid Chart Specification"}
    },
    "background": "#f9f9f9"
  };
};

// Simple component for rendering blocks of different types
const MessageContent = ({ blocks = [] }) => {
  // Single ref for all chart containers
  const chartContainerRef = useRef(null);
  
  // Use a single effect to handle all Vega-Lite chart rendering
  useEffect(() => {
    // Only proceed if we have a reference and blocks to process
    if (!chartContainerRef.current) return;
    
    const chartContainer = chartContainerRef.current;
    
    // Clear previous charts
    while (chartContainer.firstChild) {
      chartContainer.removeChild(chartContainer.firstChild);
    }
    
    // Process all vega-lite blocks
    blocks.forEach((block, index) => {
      if (block.type !== 'vega-lite' || !block.content) return;
      
      try {
        // Create a container for this specific chart
        const chartDiv = document.createElement('div');
        chartDiv.id = `vega-chart-${index}`;
        chartDiv.className = 'vega-chart-container';
        chartDiv.style.minHeight = '200px';
        chartDiv.style.width = '100%';
        chartContainer.appendChild(chartDiv);
        
        // Log spec for debugging
        console.log(`Trying to render chart ${index}:`, block.content);
        
        // Validate and fix the spec if needed
        let spec = block.content;
        let fallbackUsed = false;
        
        // More detailed logging for debugging
        console.log(`Received spec (type: ${typeof spec}):`, spec);
        
        if (!isValidVegaLiteSpec(spec)) {
          console.warn('Invalid Vega-Lite spec, using fallback', spec);
          spec = createFallbackSpec(spec);
          fallbackUsed = true;
        } else {
          console.log('Valid spec detected, proceeding with render');
        }
        
        // Use vegaEmbed with additional config options
        vegaEmbed(chartDiv, spec, { 
          actions: true,
          theme: 'light',
          renderer: 'canvas',
          logLevel: 2, // warn level
          defaultStyle: true,
          config: {
            // Add default config to help with common issues
            mark: { tooltip: true },
            axis: { titlePadding: 10 }
          }
        }).catch(error => {
          console.error('Error rendering Vega-Lite chart:', error);
          // On rendering error, show error message
          chartDiv.innerHTML = `
            <div class="error-message p-4 border border-red-300 rounded bg-red-50 text-red-700">
              <p><strong>Error rendering chart:</strong> ${error.message}</p>
              <p class="text-sm mt-2">Check the console for more details.</p>
            </div>
          `;
        });
        
        // If we used a fallback, add an error note
        if (fallbackUsed) {
          const errorNote = document.createElement('div');
          errorNote.className = 'chart-error-note p-2 text-xs text-red-600';
          errorNote.textContent = 'The original chart specification was invalid or incomplete.';
          chartDiv.appendChild(errorNote);
        }
      } catch (error) {
        console.error('Failed to process Vega-Lite spec:', error);
      }
    });
    
    // Cleanup function
    return () => {
      while (chartContainer.firstChild) {
        chartContainer.removeChild(chartContainer.firstChild);
      }
    };
  }, [blocks]);
  
  // Render function for text blocks
  const renderTextBlock = (content, index) => {
    const html = md.render(content);
    return (
      <div 
        key={`text-${index}`} 
        className="text-block prose prose-slate" 
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };
  
  // Render function for code blocks
  const renderCodeBlock = (content, language, index) => {
    return (
      <div key={`code-${index}`} className="relative my-4">
        <pre className="rounded-md bg-gray-50 p-4 overflow-x-auto">
          <code className={language ? `language-${language}` : ''}>
            {content}
          </code>
        </pre>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content);
          }}
          className="absolute top-2 right-2 p-1 rounded-md bg-gray-200 text-gray-700 text-xs hover:bg-gray-300"
        >
          Copy
        </button>
      </div>
    );
  };
  
  // Render function for tables (unused but kept for future use)
  const renderTableBlock = (tableData, index) => {
    if (!tableData.headers || !tableData.rows) {
      return <div key={`table-error-${index}`}>Invalid table data</div>;
    }
    
    return (
      <div key={`table-${index}`} className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-gray-50">
            <tr>
              {tableData.headers.map((header, i) => (
                <th key={i} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
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
    <div className="message-content">
      {blocks.map((block, index) => {
        // Render block based on type
        if (block.type === 'text' && block.content) {
          return renderTextBlock(block.content, index);
        } else if (block.type === 'code' && block.content) {
          return renderCodeBlock(block.content, block.language, index);
        } else if (block.type === 'table' && block.content) {
          return renderTableBlock(block.content, index);
        } else if (block.type === 'vega-lite') {
          // For vega-lite blocks, we don't render anything here
          // The useEffect hook handles rendering for all vega-lite blocks
          return null;
        } else {
          return <div key={`unknown-${index}`} className="error-message">Unsupported block type: {block.type}</div>;
        }
      })}
      
      {/* Container for all Vega-Lite charts */}
      <div ref={chartContainerRef} className="vega-charts-container"></div>
    </div>
  );
};

export default MessageContent; 