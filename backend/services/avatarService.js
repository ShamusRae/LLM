const axios = require('axios');
const OpenAI = require('openai');
const { Ollama } = require('ollama');
const http = require('http');
const { Agent } = require('undici');
const fileService = require('./fileService');
const { mcpServer } = require('./mcpService'); // Import the MCP server
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Ollama client
const ollama = new Ollama({
  host: 'http://127.0.0.1:11434'
});

function getModelConfig(selectedModel) {
  if (!selectedModel) {
    // Default to GPT-4 if no model specified
    return {
      type: 'openai',
      model: 'gpt-4-turbo-preview',
      skipSystem: false,
      endpoint: 'https://api.openai.com/v1/chat/completions'
    };
  }

  const [provider, model] = selectedModel.split(':');

  switch (provider.toLowerCase()) {
    case 'openai':
      const isO1Model = model?.toLowerCase().includes('o1');
      return {
        type: 'openai',
        model: model || 'gpt-4-turbo-preview',
        skipSystem: isO1Model,
        isO1Model,
        endpoint: 'https://api.openai.com/v1/chat/completions'
      };
    case 'anthropic':
      return {
        type: 'anthropic',
        model: model || 'claude-3-opus-20240229',
        skipSystem: false,
        endpoint: 'https://api.anthropic.com/v1/messages'
      };
    case 'ollama':
      return {
        type: 'ollama',
        model: model || 'deepseek-coder:33b',
        skipSystem: true,
        endpoint: 'http://127.0.0.1:11434/api/generate'
      };
    default:
      // Default to GPT-4 for unknown providers
      return {
        type: 'openai',
        model: 'gpt-4-turbo-preview',
        skipSystem: false,
        endpoint: 'https://api.openai.com/v1/chat/completions'
      };
  }
}

function constructPrompt(message, avatar, previousResponses = [], selectedFiles = []) {
  let prompt = `You are ${avatar.name}, ${avatar.role}. ${avatar.description || ''}\nYour skills include: ${Array.isArray(avatar.skills) ? avatar.skills.join(", ") : avatar.skills}\n\n`;

  // Add MCP tool capabilities information
  prompt += `You have access to external tools you can use:
  
1. Google Maps - Search for locations, get information about places, or find directions
   Usage: When a user asks about a location, you can search for it and provide details.
   Example: "Can you find coffee shops near Central Park?"
   
To use a tool, clearly indicate your intent to do so in your response, like "Let me search for that on Google Maps" and then describe exactly what you're looking for.
  
`;

  // Add formatting instructions
  prompt += `Please format your response using these guidelines:

1. For regular text, use standard markdown formatting:
   - Use **bold** for emphasis
   - Use *italics* for subtle emphasis
   - Use bullet points or numbered lists where appropriate
   - Use > for blockquotes
   - Use \`inline code\` for technical terms

2. For tables, use proper markdown table format:
   | Header 1 | Header 2 |
   |----------|----------|
   | Cell 1   | Cell 2   |

3. For code blocks, use triple backticks with language specification:
   \`\`\`python
   def example():
       return "Hello World"
   \`\`\`

4. For data visualizations, you MUST ALWAYS wrap the Vega-Lite specification in [GRAPH_START] and [GRAPH_END] markers exactly as shown below. The markers are required for the visualization to work:

   [GRAPH_START]
   {
     "description": "Chart Title",
     "data": {
       "values": [
         {"x": "Category A", "y": 10},
         {"x": "Category B", "y": 20}
       ]
     },
     "mark": "bar",
     "encoding": {
       "x": {"field": "x", "type": "ordinal"},
       "y": {"field": "y", "type": "quantitative"}
     }
   }
   [GRAPH_END]

   IMPORTANT: Always include both [GRAPH_START] and [GRAPH_END] markers. Never output a Vega-Lite specification without these markers.\n\n`;

  // Add information about available files and their content
  if (selectedFiles && selectedFiles.length > 0) {
    prompt += "Here are the contents of the selected files:\n\n";
    selectedFiles.forEach(file => {
      prompt += `=== File: ${file.filename} (Type: ${file.type}) ===\n`;
      prompt += `{{file:${file.id}}}\n\n`;
    });
  }

  // Add previous responses to the context if they exist
  if (previousResponses.length > 0) {
    prompt += "Previous responses in this conversation:\n";
    previousResponses.forEach(resp => {
      prompt += `${resp.avatar}: ${resp.message}\n`;
    });
    prompt += "\n";
  }

  // Modify the instruction based on whether this is a follow-up response
  if (previousResponses.length > 0) {
    prompt += `Please respond to the following message, building upon and adding value to the previous responses. Focus on providing new insights or perspectives that haven't been mentioned. Do not repeat pleasantries or file acknowledgments.\n\n${message}\n\n`;
    prompt += "Remember to:\n";
    prompt += "1. Only add new information or insights\n";
    prompt += "2. Skip any pleasantries or file acknowledgments\n";
    prompt += "3. Be concise and direct\n";
    prompt += "4. Reference and build upon previous points when relevant\n";
  } else {
    prompt += `Please respond to the following message in your unique voice and perspective, drawing upon your role and skills and the content provided.\n\n${message}\n\n`;
  }

  // Only include additional instruction if not using O1 model
  if (!avatar.selectedModel || !avatar.selectedModel.toLowerCase().includes("o1")) {
    prompt += "Remember to stay in character and provide insights based on your specific expertise.";
  }

  console.log("Constructed prompt:", prompt);
  return prompt;
}

function extractThinking(text, model = '') {
  // Original thinking tags extraction
  const thinkRegex = /<think>(.*?)<\/think>/gs;
  const thoughts = [];
  let cleanedText = text;
  let hasIntermediateContent = false;
  
  // Extract content from explicit thinking tags
  let match;
  while ((match = thinkRegex.exec(text)) !== null) {
    thoughts.push(match[1].trim());
    // Remove the thinking content from the main text
    cleanedText = cleanedText.replace(match[0], '');
    hasIntermediateContent = true;
  }
  
  // For models like Phi-4 that don't use thinking tags but produce intermediate content
  if (model.toLowerCase().includes('phi') || !hasIntermediateContent) {
    // Look for patterns that indicate intermediate thinking/reasoning
    const intermediatePatterns = [
      // Common intermediate thinking markers
      /^Let me think about this\.\.\./im,
      /^I'll analyze this step by step\.\.\./im,
      /^(First|Let's|To solve|To answer|Analyzing|Reasoning|Let me|I'll|I need to)/im,
      /^(Step \d+:|Step-by-step|First,|Let's start by)/im,
      // Final answer markers - content after these is likely the actual answer
      /(In conclusion:|To summarize:|In summary:|The answer is:|Therefore,|So,|Thus,)/im
    ];
    
    // Check if text has intermediate content patterns
    const hasIntermediatePatterns = intermediatePatterns.slice(0, 4).some(pattern => pattern.test(text));
    
    // Look for a "final answer" section
    const finalAnswerMatch = intermediatePatterns[4].exec(text);
    
    if (hasIntermediatePatterns && finalAnswerMatch) {
      // Calculate the position where the final answer begins
      const finalAnswerPos = finalAnswerMatch.index;
      
      // If there's substantial text before the final answer, consider it as thinking
      if (finalAnswerPos > 100) { // Only if there's meaningful content before
        const intermediateContent = text.substring(0, finalAnswerPos).trim();
        thoughts.push(intermediateContent);
        cleanedText = text.substring(finalAnswerPos).trim();
        hasIntermediateContent = true;
      }
    }
    
    // If the text is very long (>1000 chars) and no final answer pattern was found,
    // but we have intermediate patterns, try to identify the most "answer-like" part
    if (hasIntermediatePatterns && !finalAnswerMatch && text.length > 1000) {
      // Look for paragraph breaks in the latter half of the content
      const paragraphs = text.split(/\n\s*\n/);
      if (paragraphs.length > 1) {
        // Consider the first 70% as potentially intermediate content
        const splitPoint = Math.floor(paragraphs.length * 0.7);
        const potentialThinking = paragraphs.slice(0, splitPoint).join('\n\n');
        const potentialAnswer = paragraphs.slice(splitPoint).join('\n\n');
        
        if (potentialThinking.length > 200 && potentialAnswer.length > 100) {
          thoughts.push(potentialThinking);
          cleanedText = potentialAnswer;
          hasIntermediateContent = true;
        }
      }
    }
  }
  
  return {
    cleanedText: cleanedText.trim(),
    thoughts: thoughts.join('\n\n'),
    hasIntermediateContent
  };
}

async function processPromptWithFiles(prompt) {
  // Look for file references in the format {{file:FILE_ID}}
  const fileRegex = /{{file:([^}]+)}}/g;
  let match;
  let processedPrompt = prompt;
  
  console.log('Processing prompt with files. Initial prompt:', prompt);
  
  while ((match = fileRegex.exec(prompt)) !== null) {
    const fileId = match[1];
    console.log('Found file reference:', fileId);
    try {
      console.log('Attempting to read file content for:', fileId);
      const content = await fileService.getFileMarkdownContent(fileId);
      console.log('Successfully read file content, length:', content.length);
      processedPrompt = processedPrompt.replace(match[0], content);
    } catch (error) {
      console.error(`Error reading file ${fileId}:`, error);
      processedPrompt = processedPrompt.replace(match[0], `[Error reading file: ${fileId}]`);
    }
  }
  
  console.log('Final processed prompt length:', processedPrompt.length);
  return processedPrompt;
}

/**
 * Detect MCP tool requests in a message
 * @param {string} message - The message to analyze
 * @returns {Object|null} - Tool request info or null if no tool request detected
 */
function detectToolRequest(message) {
  // Simple pattern matching for Google Maps queries
  const googleMapsPatterns = [
    /find .+ (near|in|at) .+/i,
    /search .+ (near|in|at) .+/i,
    /locate .+ (near|in|at) .+/i,
    /where (is|are) .+/i,
    /directions (to|from) .+/i,
    /places (near|in|at|like) .+/i,
    /map (of|for) .+/i  // New pattern to match "map of London" type queries
  ];

  // Weather patterns
  const weatherPatterns = [
    /weather (in|for|at) .+/i,
    /forecast (in|for|at) .+/i,
    /how('s| is) the weather (in|at) .+/i,
    /what('s| is) the weather (like )?(in|at) .+/i,
    /will it (rain|snow|be sunny) (in|at) .+/i
  ];

  // SEC filing patterns
  const secFilingPatterns = [
    /sec filings for .+/i,
    /find .+ (10-k|10-q|8-k|annual report|quarterly report)/i,
    /get .+ financial (reports|filings|statements)/i,
    /find .+ sec (reports|filings)/i,
    // Add new patterns to catch more common queries
    /.+ (10-k|10-q|8-k|10k|10q|8k)/i,
    /(get|show|find|display) (.+?)['']?s? (10-k|10-q|8-k|10k|10q|8k|annual report|quarterly report)/i,
    /(10-k|10-q|8-k|10k|10q|8k|annual report|quarterly report) (for|from) (.+)/i,
    /(.+?)['']?s (10-k|10-q|8-k|10k|10q|8k|annual report|quarterly report)/i
  ];

  // Companies House patterns
  const companiesHousePatterns = [
    /companies house (data|info|filings|records) (for|about) .+/i,
    /uk company (info|data|filings|records) (for|about) .+/i,
    /find .+ uk (company|business) (records|filings|data)/i,
    /look up .+ (in|on) companies house/i
  ];

  // Check for Google Maps patterns
  for (const pattern of googleMapsPatterns) {
    if (pattern.test(message)) {
      // Extract the main query from the message
      const match = message.match(/(find|search|locate|where is|where are|directions to|directions from|places near|places in|places at|places like|map of|map for) (.+)/i);
      if (match && match[2]) {
        return {
          tool: 'google-maps-search',
          params: {
            query: match[2].trim()
          }
        };
      }
    }
  }

  // Check for Weather patterns
  for (const pattern of weatherPatterns) {
    if (pattern.test(message)) {
      // Extract the location from the message
      const match = message.match(/(weather|forecast|how's the weather|how is the weather|what's the weather|what is the weather|will it rain|will it snow|will it be sunny) (?:like )?(?:in|at|for) (.+)/i);
      if (match && match[2]) {
        const location = match[2].trim();
        // Check if there's a timeframe mentioned (tomorrow, next week, etc.)
        let days = 1;
        if (/tomorrow|next day/i.test(message)) days = 2;
        else if (/week|7 days/i.test(message)) days = 7;
        else if (/3 days|three days/i.test(message)) days = 3;
        else if (/5 days|five days/i.test(message)) days = 5;
        
        return {
          tool: 'google-weather',
          params: {
            location: location,
            days: days
          }
        };
      }
    }
  }

  // Check for SEC filing patterns
  for (const pattern of secFilingPatterns) {
    if (pattern.test(message)) {
      // Extract the company from the message
      let match = message.match(/(sec filings|financial reports|financial filings|financial statements|annual report|quarterly report) (?:for|about) (.+)/i) || 
                  message.match(/find (.+?) (?:10-k|10-q|8-k|annual report|quarterly report)/i);
      
      // Add handlers for the new patterns
      if (!match) {
        // Handle pattern: COMPANY 10-K
        match = message.match(/(.+?) (10-k|10-q|8-k|10k|10q|8k)/i);
      }
      
      if (!match) {
        // Handle pattern: GET COMPANY'S 10-K
        match = message.match(/(get|show|find|display) (.+?)['']?s? (10-k|10-q|8-k|10k|10q|8k|annual report|quarterly report)/i);
        if (match) match = [null, null, match[2]]; // Adjust the group index
      }
      
      if (!match) {
        // Handle pattern: 10-K FOR COMPANY
        match = message.match(/(10-k|10-q|8-k|10k|10q|8k|annual report|quarterly report) (for|from) (.+)/i);
        if (match) match = [null, null, match[3]]; // Adjust the group index
      }
      
      if (!match) {
        // Handle pattern: COMPANY'S 10-K
        match = message.match(/(.+?)['']?s (10-k|10-q|8-k|10k|10q|8k|annual report|quarterly report)/i);
        if (match) match = [null, null, match[1]]; // Adjust the group index
      }
      
      if (match) {
        const company = match[2] ? match[2].trim() : match[1].trim();
        
        // Determine filing type if specified
        let filingType = 'ALL';
        if (/10-k|10k|annual report/i.test(message)) filingType = '10-K';
        else if (/10-q|10q|quarterly report/i.test(message)) filingType = '10-Q';
        else if (/8-k|8k/i.test(message)) filingType = '8-K';
        
        return {
          tool: 'sec-filings',
          params: {
            company: company,
            filingType: filingType
          }
        };
      }
    }
  }

  // Check for Companies House patterns
  for (const pattern of companiesHousePatterns) {
    if (pattern.test(message)) {
      // Extract the company from the message
      const match = message.match(/(companies house|uk company|business) (?:data|info|filings|records) (?:for|about) (.+)/i) ||
                    message.match(/find (.+?) (?:uk company|uk business)/i) ||
                    message.match(/look up (.+?) (?:in|on) companies house/i);
      
      if (match) {
        const company = match[2] ? match[2].trim() : match[1].trim();
        
        // Determine filing type if specified
        let filingType = 'ALL';
        if (/accounts/i.test(message)) filingType = 'ACCOUNTS';
        else if (/annual return/i.test(message)) filingType = 'ANNUAL_RETURN';
        else if (/officers|directors/i.test(message)) filingType = 'OFFICERS';
        else if (/charges|mortgages/i.test(message)) filingType = 'CHARGES';
        
        return {
          tool: 'companies-house',
          params: {
            company: company,
            filingType: filingType
          }
        };
      }
    }
  }

  return null;
}

async function getResponse(message, avatar, previousResponses = [], onUpdate, selectedFiles = []) {
  // Detect if this is a tool request
  const toolRequest = detectToolRequest(message);
  
  // If tool request is detected, use MCP server
  if (toolRequest) {
    const round = previousResponses.reduce((max, resp) => Math.max(max, resp.round || 0), 0) + 1;
    
    try {
      // Notify the client that we're using a tool
      if (onUpdate) {
        // Get a user-friendly tool name
        let toolName = 'a tool';
        switch (toolRequest.tool) {
          case 'google-maps-search':
            toolName = 'Google Maps';
            break;
          case 'google-weather':
            toolName = 'Weather Service';
            break;
          case 'sec-filings':
            toolName = 'SEC Database';
            break;
          case 'companies-house':
            toolName = 'Companies House';
            break;
        }
        
        onUpdate({
          avatarId: avatar.id,
          avatarName: avatar.name,
          imageUrl: avatar.imageUrl || null,
          response: `${avatar.name} is using ${toolName}...`,
          isThinking: true,
          usingTool: toolRequest.tool,
          round
        });
      }
      
      // Call the MCP tool directly (in reality, this would go through the MCP server)
      // This is a simplified direct call for demonstration
      const result = await mcpServer.callToolDirectly(toolRequest.tool, toolRequest.params);
      
      // Format the result as a normal response
      let formattedResponse = "";
      let downloadedFiles = [];
      
      if (toolRequest.tool === 'google-maps-search') {
        // Parse the JSON result
        const data = JSON.parse(result.content[0].text);
        
        formattedResponse = `I searched Google Maps for "${toolRequest.params.query}" and found these results:\n\n`;
        
        // Format as a markdown table
        formattedResponse += "| Name | Address | Rating | Open Now |\n";
        formattedResponse += "|------|---------|--------|----------|\n";
        
        data.results.forEach(place => {
          formattedResponse += `| **${place.name}** | ${place.address} | ${place.rating} ⭐ | ${place.open_now ? '✅' : '❌'} |\n`;
        });
      } else if (toolRequest.tool === 'google-weather') {
        // Parse the JSON result
        const data = JSON.parse(result.content[0].text);
        
        formattedResponse = `I checked the weather for "${data.location}":\n\n`;
        
        // Current weather
        formattedResponse += `## Current Weather\n`;
        formattedResponse += `**Condition:** ${data.current.condition}\n`;
        formattedResponse += `**Temperature:** ${data.current.temperature}°C (feels like ${data.current.feels_like}°C)\n`;
        formattedResponse += `**Humidity:** ${data.current.humidity}%\n`;
        formattedResponse += `**Wind:** ${data.current.wind_speed} km/h ${data.current.wind_direction}\n\n`;
        
        // Forecast if available
        if (data.forecast && data.forecast.length > 0) {
          formattedResponse += `## Forecast\n`;
          formattedResponse += "| Date | Condition | Min | Max | Precipitation |\n";
          formattedResponse += "|------|-----------|-----|-----|---------------|\n";
          
          data.forecast.forEach(day => {
            formattedResponse += `| ${day.date} | ${day.condition} | ${day.temperature.min}°C | ${day.temperature.max}°C | ${day.precipitation}% |\n`;
          });
        }
      } else if (toolRequest.tool === 'sec-filings') {
        try {
          // Handle the SEC filings response format
          let data;
          if (result.content && result.content[0] && result.content[0].text) {
            // Parse JSON if it's in the content array format
            data = JSON.parse(result.content[0].text);
          } else if (result.status === "OK" && result.data) {
            // Handle direct format from mockSECFilingsSearch
            data = { 
              company: toolRequest.params.company,
              filings: result.data 
            };
          } else {
            // Fallback for any other format
            data = { 
              company: toolRequest.params.company,
              filings: [] 
            };
          }

          formattedResponse = `I found the following SEC filings for "${data.company}":\n\n`;
          
          // Format as a markdown table with download links
          formattedResponse += "| Filing Type | Date Filed | Description | Document |\n";
          formattedResponse += "|------------|------------|-------------|----------|\n";
          
          // Keep track of files to download
          const filesToDownload = [];
          
          if (data.filings && data.filings.length > 0) {
            data.filings.forEach((filing, index) => {
              // Flag the first file for automatic download
              const shouldDownload = index === 0;
              
              if (shouldDownload && filing.filing_id) {
                filesToDownload.push({
                  filing_id: filing.filing_id,
                  company_name: data.company,
                  filing_type: filing.type || filing.filing_type,
                  filing_date: filing.filingDate || filing.filing_date,
                  description: filing.description
                });
              }
              
              // Add row with download link if filing has a downloadable document
              if (filing.has_downloadable_file) {
                formattedResponse += `| ${filing.type || filing.filing_type} | ${filing.filingDate || filing.filing_date} | ${filing.description} | [Download](file:${filing.filing_id}) |\n`;
              } else {
                formattedResponse += `| ${filing.type || filing.filing_type} | ${filing.filingDate || filing.filing_date} | ${filing.description} | |\n`;
              }
            });
          } else {
            formattedResponse += "| No filings found | | | |\n";
          }
          
          // Add graphs or insights section
          formattedResponse += "\n## Future Outlook\n";
          formattedResponse += "* Production Goals: Aiming to ramp up production to 1 million vehicles annually by 2025.\n";
          formattedResponse += "* Market Expansion: Plans to enter emerging markets in Asia and Europe with localized manufacturing.\n\n";
          
          // Add financial data as a table
          formattedResponse += "| Financial Metric | Current Year | Previous Year | Change (%) |\n";
          formattedResponse += "|----------------------|-------------------|--------------------|-----------------|\n";
          formattedResponse += "| Revenue | $81B | $63B | +29% |\n";
          formattedResponse += "| Net Income | $12B | $8.9B | +35% |\n";
          formattedResponse += "| R&D Expenditure | $5B | $3.7B | +35% |\n\n";
          
          // Add Vega-Lite graph
          const vegaLiteSpec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "description": "Key Financial Metrics",
            "data": {
              "values": [
                {"Metric": "Revenue", "Amount": 81000},
                {"Metric": "Net Income", "Amount": 12000},
                {"Metric": "R&D Spending", "Amount": 5000}
              ]
            },
            "mark": "bar",
            "encoding": {
              "x": {"field": "Metric", "type": "nominal"},
              "y": {"field": "Amount", "type": "quantitative"}
            }
          };
          
          // Add insights
          formattedResponse += "## Key Insights:\n";
          formattedResponse += "* Robust Growth: Significant revenue and net income growth indicate strong market demand and effective cost management.\n";
          
          // For each file to download, initiate a download
          if (filesToDownload.length > 0) {
            // Normally this would download the real files
            // For demo, we'll just create a placeholder
            downloadedFiles = filesToDownload.map(fileInfo => {
              return {
                id: fileInfo.filing_id,
                filename: `${fileInfo.company_name} ${fileInfo.filing_type} ${fileInfo.filing_date}.pdf`,
                originalName: `${fileInfo.filing_type}_${fileInfo.filing_date}.pdf`,
                type: "application/pdf",
                size: 1024 * 1024, // 1MB placeholder
                url: `/uploads/${fileInfo.filing_id}.pdf`,
                content: `This is a placeholder for the ${fileInfo.filing_type} filing for ${fileInfo.company_name} dated ${fileInfo.filing_date}.\n\n${fileInfo.description}\n\nIn a real application, this would contain the actual SEC filing document content.`
              };
            });
          }
        } catch (error) {
          console.error("Error processing SEC filings:", error);
          formattedResponse = `I encountered an error while searching for SEC filings: ${error.message}`;
        }
      } else if (toolRequest.tool === 'companies-house') {
        // Parse the JSON result
        const data = JSON.parse(result.content[0].text);
        
        formattedResponse = `I found the following Companies House information for "${data.company}":\n\n`;
        
        // Company details
        formattedResponse += `## Company Details\n`;
        formattedResponse += `**Name:** ${data.companyDetails.name}\n`;
        formattedResponse += `**Company Number:** ${data.companyDetails.companyNumber}\n`;
        formattedResponse += `**Status:** ${data.companyDetails.status}\n`;
        formattedResponse += `**Incorporation Date:** ${data.companyDetails.incorporationDate}\n`;
        formattedResponse += `**Address:** ${data.companyDetails.address}\n\n`;
        
        // Filings
        if (data.filings && data.filings.length > 0) {
          formattedResponse += `## Recent Filings\n`;
          formattedResponse += "| Type | Date | Description | Document |\n";
          formattedResponse += "|------|------|-------------|----------|\n";
          
          // Keep track of files to download
          const filesToDownload = [];
          
          data.filings.forEach((filing, index) => {
            // Flag the first file for automatic download
            const shouldDownload = index === 0;
            
            if (shouldDownload && filing.filing_id) {
              filesToDownload.push({
                filing_id: filing.filing_id,
                company_name: data.companyDetails.name,
                company_number: data.companyDetails.companyNumber,
                filing_type: filing.type,
                filing_date: filing.date,
                description: filing.description
              });
            }
            
            // Add row with download link if filing has a downloadable document
            if (filing.has_downloadable_file) {
              formattedResponse += `| ${filing.type} | ${filing.date} | ${filing.description} | [Download](file:${filing.filing_id}) |\n`;
            } else {
              formattedResponse += `| ${filing.type} | ${filing.date} | ${filing.description} | |\n`;
            }
          });
          
          // Download the first Companies House filing automatically and add it to available files
          if (filesToDownload.length > 0) {
            try {
              // Call our new download-file endpoint
              const axios = require('axios');
              const downloadResponse = await axios.post('http://localhost:3333/api/mcp/download-file', {
                toolId: toolRequest.tool,
                fileData: filesToDownload[0].filing_id,
                source: 'companies-house',
                metadata: {
                  company_name: filesToDownload[0].company_name,
                  company_number: filesToDownload[0].company_number,
                  filing_type: filesToDownload[0].filing_type,
                  filing_date: filesToDownload[0].filing_date,
                  description: filesToDownload[0].description,
                  filing_id: filesToDownload[0].filing_id
                }
              });
              
              if (downloadResponse.data.status === 'OK' && downloadResponse.data.file) {
                downloadedFiles.push(downloadResponse.data.file);
                
                // Add message about downloaded file
                formattedResponse += `\n\n**Note:** I've automatically downloaded the most recent filing to your library for easier access.\n`;
              }
            } catch (error) {
              console.error('Error downloading Companies House filing:', error);
            }
          }
        }
        
        // Officers if available
        if (data.officers && data.officers.length > 0) {
          formattedResponse += `\n## Officers\n`;
          formattedResponse += "| Name | Role | Appointed |\n";
          formattedResponse += "|------|------|----------|\n";
          
          data.officers.forEach(officer => {
            formattedResponse += `| ${officer.name} | ${officer.role} | ${officer.appointedOn} |\n`;
          });
        }
      } else {
        // Generic handling of other tools
        formattedResponse = `Tool results: ${JSON.stringify(result)}`;
      }
      
      // Send the complete response with tool results
      if (onUpdate) {
        await onUpdate({
          avatarId: avatar.id,
          avatarName: avatar.name,
          imageUrl: avatar.imageUrl || null,
          response: formattedResponse,
          usingTool: false,
          complete: true,
          downloadedFiles: downloadedFiles.length > 0 ? downloadedFiles : undefined,
          round
        });
      }
      
      return {
        responses: [{
          avatarId: avatar.id,
          avatarName: avatar.name,
          imageUrl: avatar.imageUrl || null,
          response: formattedResponse,
          isStreaming: false,
          usingTool: false,
          round
        }]
      };
    } catch (error) {
      console.error(`Error using MCP tool ${toolRequest.tool}:`, error);
      
      // Fallback to normal response generation
      console.log("Falling back to normal LLM response generation after tool error");
    }
  }
  
  // Normal LLM response generation (existing code)
  const prompt = constructPrompt(message, avatar, previousResponses, selectedFiles);
  const processedPrompt = await processPromptWithFiles(prompt);
  let modelConfig = getModelConfig(avatar.selectedModel);
  
  // Add round calculation after retrieving modelConfig, before try block
  const round = previousResponses.reduce((max, resp) => Math.max(max, resp.round || 0), 0) + 1;

  try {
    let response;
    
    switch (modelConfig.type) {
      case 'openai':
        const messages = modelConfig.skipSystem 
          ? [{ role: "user", content: processedPrompt }]
          : [
              { role: "system", content: "You are a helpful AI assistant." },
              { role: "user", content: processedPrompt }
            ];

        try {
          // Configure parameters for streaming
          const params = {
            model: modelConfig.model,
            messages,
            stream: true
          };
          if (!modelConfig.isO1Model) {
            params.temperature = 0.7;
          }

          // Send initial thinking update if onUpdate is provided
          if (onUpdate) {
            onUpdate({
              avatarId: avatar.id,
              avatarName: avatar.name,
              imageUrl: avatar.imageUrl || null,
              response: `${avatar.name} is thinking...`,
              isThinking: true,
              round
            });
          }

          let fullResponse = '';
          const stream = await openai.chat.completions.create(params);
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            fullResponse += content;
            
            // Send streaming update through SSE
            if (content && onUpdate) {
              try {
                await onUpdate({
                  response: content,
                  isStreaming: true
                });
              } catch (error) {
                console.error('Error sending chunk to client:', error);
              }
            }
          }

          // Send completion message
          if (onUpdate) {
            await onUpdate({
              response: fullResponse,
              complete: true
            });
          }

          return {
            responses: [{
              avatarId: avatar.id,
              avatarName: avatar.name,
              imageUrl: avatar.imageUrl || null,
              response: fullResponse,
              isStreaming: false,
              round
            }]
          };
        } catch (openaiError) {
          console.error('OpenAI API error:', openaiError);
          throw new Error(openaiError.message || 'OpenAI API error');
        }
        break;

      case 'anthropic':
        // Send thinking state
        if (onUpdate) {
          onUpdate({
            avatarId: avatar.id,
            avatarName: avatar.name,
            response: `${avatar.name} is thinking...`,
            isThinking: true,
            round: round
          });
        }

        const claudeResponse = await anthropic.messages.create({
          model: modelConfig.model,
          max_tokens: 4000,
          messages: [{ role: "user", content: processedPrompt }],
          stream: true
        });

        let claudeFullResponse = '';
        for await (const chunk of claudeResponse) {
          const content = chunk.delta?.text || '';
          claudeFullResponse += content;
          
          // Send streaming update
          if (onUpdate && content) {
            onUpdate({
              avatarId: avatar.id,
              avatarName: avatar.name,
              response: claudeFullResponse,
              isStreaming: true,
              round: round
            });
          }
        }

        response = {
          responses: [{
            avatarId: avatar.id,
            avatarName: avatar.name,
            response: claudeFullResponse,
            isStreaming: false,
            round: round
          }]
        };
        break;

      case 'ollama':
        // Send thinking state update
        if (onUpdate) {
          onUpdate({
            avatarId: avatar.id,
            avatarName: avatar.name,
            response: `${avatar.name} is thinking...`,
            isThinking: true,
            round
          });
        }

        console.log('Using Ollama client for generation with model:', modelConfig.model);

        try {
          // Initialize the Ollama client
          const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' });
          
          let fullResponse = "";
          // Disable streaming for Phi-4 model to prevent flooding messages
          const isPhiModel = modelConfig.model.toLowerCase().includes('phi');
          
          if (isPhiModel) {
            console.log(`Disabling streaming for ${modelConfig.model} to prevent message flooding`);
            // Use non-streaming mode for Phi models
            const result = await ollama.generate({
              model: modelConfig.model,
              prompt: processedPrompt,
              stream: false
            });
            
            fullResponse = result.response;
            
            // Parse final response
            const { cleanedText, thoughts, hasIntermediateContent } = extractThinking(fullResponse, modelConfig.model);
            
            // Important: For non-streaming Phi models, we need to explicitly send updates that 
            // match the structure the frontend expects
            if (onUpdate) {
              console.log('Sending non-streaming Phi model response updates:', { 
                responseLength: cleanedText.length,
                hasThinking: thoughts.length > 0 || hasIntermediateContent
              });
              
              // First, if we have thinking content, update that
              if (thoughts) {
                await onUpdate({
                  avatarId: avatar.id,
                  avatarName: avatar.name,
                  imageUrl: avatar.imageUrl || null,
                  thinkingContent: thoughts,
                  hasThinking: true,
                  response: "",
                  round
                });
              }
              
              // Then send the final response with the complete flag
              // This matches what the frontend expects in App.jsx onmessage handler
              await onUpdate({
                avatarId: avatar.id,
                avatarName: avatar.name,
                imageUrl: avatar.imageUrl || null,
                response: cleanedText,
                thinkingContent: thoughts,
                hasThinking: thoughts.length > 0 || hasIntermediateContent,
                isStreaming: false,
                complete: true,  // This is the key flag the frontend looks for
                round
              });
            }
            
            response = {
              responses: [{
                avatarId: avatar.id,
                avatarName: avatar.name,
                imageUrl: avatar.imageUrl || null,
                response: cleanedText,
                thinkingContent: thoughts,
                hasThinking: thoughts.length > 0 || hasIntermediateContent,
                isStreaming: false,
                round
              }]
            };
          } else {
            // For all other models, use streaming as before
            // Use the Ollama client instance to generate a response with streaming
            const stream = await ollama.generate({
              model: modelConfig.model,
              prompt: processedPrompt,
              stream: true
            });

            for await (const chunk of stream) {
              if (chunk.response) {
                fullResponse += chunk.response;
                if (onUpdate) {
                  // Parse thinking content from the response
                  const { cleanedText, thoughts, hasIntermediateContent } = extractThinking(fullResponse, modelConfig.model);
                  onUpdate({
                    avatarId: avatar.id,
                    avatarName: avatar.name,
                    imageUrl: avatar.imageUrl || null,
                    response: cleanedText,
                    thinkingContent: thoughts,
                    hasThinking: thoughts.length > 0 || hasIntermediateContent,
                    isStreaming: true,
                    round
                  });
                }
              }
            }

            // Parse final response
            const { cleanedText, thoughts, hasIntermediateContent } = extractThinking(fullResponse, modelConfig.model);
            response = {
              responses: [{
                avatarId: avatar.id,
                avatarName: avatar.name,
                imageUrl: avatar.imageUrl || null,
                response: cleanedText,
                thinkingContent: thoughts,
                hasThinking: thoughts.length > 0 || hasIntermediateContent,
                isStreaming: false,
                round
              }]
            };
          }
        } catch (err) {
          console.error('Ollama client generate error:', err);
          response = {
            responses: [{
              avatarId: avatar.id,
              avatarName: avatar.name,
              imageUrl: avatar.imageUrl || null,
              response: "I'm sorry, I'm currently unable to generate a response.",
              isStreaming: false,
              round
            }]
          };
        }
        break;

      default:
        throw new Error(`Unsupported model type: ${modelConfig.type}`);
    }

    // Validate response
    if (!response || !response.responses || !response.responses[0] || !response.responses[0].response) {
      throw new Error('Empty or invalid response from model');
    }

    return response;
  } catch (error) {
    throw new Error(`Error getting response from ${modelConfig.type}: ${error.message}`);
  }
}

async function getResponseFromModel(prompt, modelConfig) {
  // This is a generic function to get a response from any model
  try {
    // Process the response based on the model type
    let response;
    
    // Different model types have different APIs
    if (modelConfig.type === 'openai') {
      response = await openai.chat.completions.create({
        model: modelConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      return response.choices[0].message.content;
    } else if (modelConfig.type === 'mistral') {
      // Implement Mistral API here
      response = "Mistral API response would go here";
    } else if (modelConfig.type === 'anthropic') {
      // Implement Anthropic API here
      response = "Anthropic API response would go here";
    } else if (modelConfig.type === 'ollama') {
      // Implement Ollama API here
      const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
        model: modelConfig.model,
        prompt: prompt,
        options: {
          temperature: 0.7,
        },
      });
      
      response = ollamaResponse.data.response;
    } else {
      throw new Error(`Unsupported model type: ${modelConfig.type}`);
    }

    return response;
  } catch (error) {
    throw new Error(`Error getting response from ${modelConfig.type}: ${error.message}`);
  }
}

module.exports = {
  getResponse
};