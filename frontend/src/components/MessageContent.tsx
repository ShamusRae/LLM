import React, { useState, useEffect, useRef } from 'react';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import MarkdownIt from 'markdown-it';
import Table from './Table';

// Define interfaces
interface Block {
  type: 'text' | 'code' | 'vega-lite' | 'table';
  content: any;
  language?: string;
}

interface MessageContentProps {
  blocks: Block[];
}

interface VegaLiteSpec {
  data: any;
  mark: string;
  encoding: {
    [key: string]: any;
  };
  description?: string;
}

// Initialize markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

// Type guard for VegaLite specifications
function isVegaLiteSpec(obj: any): obj is VegaLiteSpec {
  return (
    obj &&
    typeof obj === 'object' &&
    'data' in obj &&
    'mark' in obj &&
    'encoding' in obj
  );
}

// Pure rendering functions (no hooks)
const renderText = (content: string) => (
  <div 
    className="prose prose-sm max-w-none"
    dangerouslySetInnerHTML={{ __html: md.render(content) }}
  />
);

const renderCode = (content: string, language?: string) => (
  <div className="relative">
    <button
      onClick={() => navigator.clipboard.writeText(content)}
      className="absolute top-2 right-2 p-2 rounded-md bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
    >
      Copy
    </button>
    <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto my-4">
      <code className={language ? `language-${language}` : ''}>
        {content}
      </code>
    </pre>
  </div>
);

const renderTable = (content: any) => (
  <Table
    columns={content.columns}
    data={content.rows}
    showCopyButton={true}
  />
);

/**
 * Main MessageContent component that handles all blocks
 */
const MessageContent: React.FC<MessageContentProps> = ({ blocks }) => {
  // Create refs to hold div elements for each vega-lite chart
  const chartRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Create state to hold parsed vega-lite specs from text blocks
  const [parsedSpecs, setParsedSpecs] = useState<(VegaLiteSpec | null)[]>(
    Array(blocks.length).fill(null)
  );
  
  // Effect to parse text blocks for potential vega-lite specs
  useEffect(() => {
    const newParsedSpecs: (VegaLiteSpec | null)[] = blocks.map((block, index) => {
      // Skip non-text blocks
      if (block.type !== 'text') return null;
      
      // Try to parse as JSON
      try {
        const content = block.content;
        if (typeof content !== 'string') return null;
        
        const trimmedContent = content.trim();
        let jsonContent: any = null;
        
        // Try to parse as JSON directly
        try {
          jsonContent = JSON.parse(trimmedContent);
        } catch (e) {
          // Try to extract from graph markers
          if (trimmedContent.includes('[GRAPH_START]') && trimmedContent.includes('[GRAPH_END]')) {
            const extracted = trimmedContent
              .split('[GRAPH_START]')[1]
              .split('[GRAPH_END]')[0]
              .trim();
            try {
              jsonContent = JSON.parse(extracted);
            } catch (e2) {
              // Not valid JSON within markers, ignore
            }
          }
        }
        
        // If we have valid JSON that looks like a VegaLite spec, return it
        if (isVegaLiteSpec(jsonContent)) {
          return jsonContent as VegaLiteSpec;
        }
      } catch (err) {
        // Ignore errors - this just means it's not a valid spec
      }
      
      return null;
    });
    
    setParsedSpecs(newParsedSpecs);
  }, [blocks]);
  
  // Effect to render all vega-lite charts
  useEffect(() => {
    // Setup function to render charts
    const renderCharts = async () => {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const chartRef = chartRefs.current[i];
        
        // Skip if there's no container for this chart
        if (!chartRef) continue;
        
        // Determine the spec to use
        let spec: any = null;
        if (block.type === 'vega-lite') {
          spec = block.content;
        } else if (block.type === 'text' && parsedSpecs[i]) {
          spec = parsedSpecs[i];
        }
        
        // Skip if there's no spec
        if (!spec) continue;
        
        try {
          // Clear container
          chartRef.innerHTML = '';
          
          // Compile Vega-Lite to Vega
          const compiledSpec = vegaLite.compile(spec).spec;
          
          // Create and render the visualization
          const view = new vega.View(vega.parse(compiledSpec), {
            renderer: 'canvas', 
            container: chartRef as HTMLElement,
            hover: true
          });
          
          await view.runAsync();
        } catch (error) {
          console.error(`Error rendering chart at index ${i}:`, error);
        }
      }
    };
    
    // Call the rendering function
    renderCharts();
    
    // Cleanup function
    return () => {
      chartRefs.current.forEach(ref => {
        if (ref) ref.innerHTML = '';
      });
    };
  }, [blocks, parsedSpecs]);
  
  // Ensure chartRefs array has the correct length
  if (chartRefs.current.length !== blocks.length) {
    chartRefs.current = Array(blocks.length).fill(null);
  }
  
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        // Determine if this block should show a vega-lite chart
        const hasVegaLite = 
          block.type === 'vega-lite' || 
          (block.type === 'text' && parsedSpecs[index]);
          
        // Get the spec to use for copy button
        const specToUse = 
          block.type === 'vega-lite' 
            ? block.content 
            : parsedSpecs[index];
        
        return (
          <div key={`block-${index}`} className="block-wrapper">
            {/* For vega-lite charts */}
            {hasVegaLite && (
              <div className="my-4 p-4 rounded-lg border border-gray-200 bg-gray-50 relative">
                <button
                  onClick={() => specToUse && navigator.clipboard.writeText(JSON.stringify(specToUse, null, 2))}
                  className="absolute top-2 right-2 p-2 rounded-md bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
                >
                  Copy
                </button>
                <div 
                  ref={el => chartRefs.current[index] = el} 
                  style={{ width: '100%', minHeight: '300px' }} 
                />
              </div>
            )}
            
            {/* For text blocks that don't have vega-lite spec */}
            {block.type === 'text' && !parsedSpecs[index] && renderText(block.content)}
            
            {/* For code blocks */}
            {block.type === 'code' && renderCode(block.content, block.language)}
            
            {/* For table blocks */}
            {block.type === 'table' && renderTable(block.content)}
          </div>
        );
      })}
    </div>
  );
};

export default MessageContent; 