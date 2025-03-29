const axios = require('axios');
const OpenAI = require('openai');
const { Ollama } = require('ollama');
const http = require('http');
const { Agent } = require('undici');
const fileService = require('./fileService');
const { mcpServer } = require('./mcpService'); // Import the MCP server
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');
const config = require('../config/default');
const { Configuration, OpenAIApi } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Ollama client
const ollama = new Ollama({
  host: 'http://127.0.0.1:11434'
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
});

/**
 * Generic function to download a file from a URL and add it to the file repository
 * @param {Object} options - Download options
 * @param {string} options.url - URL to download from
 * @param {string} options.fileName - Suggested file name
 * @param {string} options.fileType - Type of file (e.g., 'SEC Filing', 'Companies House Document')
 * @param {string} options.description - Description of the file
 * @param {Object} options.metadata - Additional metadata for the file
 * @returns {Promise<Object>} - Downloaded file info or null if failed
 */
async function downloadFileFromUrl(options) {
  if (!options || !options.url) {
    console.error('URL is required for file download');
    return null;
  }

  console.log(`Attempting to download file from: ${options.url}`);
  
  try {
    // Use our file API to download and process the file
    const uploadResponse = await axios.post('http://localhost:3001/api/file/upload-from-url', {
      url: options.url,
      fileName: options.fileName,
      fileType: options.fileType,
      description: options.description
    });
    
    if (uploadResponse.data.success && uploadResponse.data.file) {
      console.log(`Successfully downloaded file: ${options.fileName}`);
      return uploadResponse.data.file;
    } else {
      console.error('File download failed:', uploadResponse.data);
      return null;
    }
  } catch (error) {
    console.error('Error downloading file from URL:', error.message);
    return null;
  }
}

function getModelConfig(selectedModel) {
  if (!selectedModel) {
    // Default to GPT-4 if no model specified
    return {
      type: 'openai',
      model: 'gpt-4-turbo-preview',
      skipSystem: false,
      supportsFunctionCalling: true,
      endpoint: 'https://api.openai.com/v1/chat/completions'
    };
  }

  const [provider, model] = selectedModel.split(':');

  switch (provider.toLowerCase()) {
    case 'openai':
      const isO1Model = model?.toLowerCase().includes('o1');
      // OpenAI models that support function calling
      const supportsFunctionCalling = 
        model?.toLowerCase().includes('gpt-4') || 
        model?.toLowerCase().includes('gpt-3.5-turbo') ||
        model?.toLowerCase().includes('gpt-4o');
      
      return {
        type: 'openai',
        model: model || 'gpt-4-turbo-preview',
        skipSystem: isO1Model,
        isO1Model,
        supportsFunctionCalling,
        endpoint: 'https://api.openai.com/v1/chat/completions'
      };
    case 'anthropic':
      // Modern Claude models support tool/function calling
      const claudeFunctionCalling = 
        model?.toLowerCase().includes('claude-3') ||
        model?.toLowerCase().includes('claude-3.5');
      
      return {
        type: 'anthropic',
        model: model || 'claude-3-opus-20240229',
        skipSystem: false,
        supportsFunctionCalling: claudeFunctionCalling,
        endpoint: 'https://api.anthropic.com/v1/messages'
      };
    case 'ollama':
      return {
        type: 'ollama',
        model: model || 'deepseek-coder:33b',
        skipSystem: true,
        supportsFunctionCalling: false, // Most Ollama models don't natively support function calling
        endpoint: 'http://127.0.0.1:11434/api/generate'
      };
    default:
      // Default to GPT-4 for unknown providers
      return {
        type: 'openai',
        model: 'gpt-4-turbo-preview',
        skipSystem: false,
        supportsFunctionCalling: true,
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
 * Extract company name from a message using the LLM
 * @param {string} message - The message containing a company name
 * @returns {Promise<string>} - The extracted company name
 */
async function extractCompanyName(message) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not found, falling back to regex extraction');
      return null;
    }

    console.log(`Using LLM to extract company name from: "${message}"`);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts company names from text. Respond with ONLY the company name, nothing else. For example, if given "Can you get me Apple\'s 10-K?", you would respond with just "Apple".'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.1,
        max_tokens: 20
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const companyName = response.data.choices[0].message.content.trim();
    console.log(`LLM extracted company name: "${companyName}"`);
    return companyName;
  } catch (error) {
    console.error('Error extracting company name with LLM:', error);
    return null;
  }
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

  // Yahoo Finance patterns
  const yahooFinancePatterns = [
    // Stock price patterns
    /(?:what(?:'s| is) the )?(?:stock |share |)price(?: of| for) ([A-Za-z0-9\.\-]+)(?:\?|$|\.|)/i,
    /(?:how much (?:is|does) |what(?:'s| is) the value of )([A-Za-z0-9\.\-]+)(?: stock| share| trading at)(?:\?|$|\.|)/i,
    /(?:get|show|tell me|find)(?: me)? (?:the )?([A-Za-z0-9\.\-]+) (?:stock|share) price(?:\?|$|\.|)/i,
    
    // Financial metrics patterns
    /(?:what(?:'s| is) the |get |show |find )(?:the )?([a-zA-Z ]+?)(?= for| of) (?:for|of) ([A-Za-z0-9\.\-]+)(?:\?|$|\.|)/i,
    /(?:what(?:'s| is)|get|show|find) ([A-Za-z0-9\.\-]+)(?:'s| company\'s| corporation\'s| stock\'s) ([a-zA-Z ]+?)(?:\?|$|\.|)/i,
    
    // Historical data patterns
    /(?:show|get|find|give me)(?: me)? (?:the )?(?:historical|history|past|previous) (?:data|performance|prices|chart) (?:for|of) ([A-Za-z0-9\.\-]+)(?: for)?(?: the past)?(?: last)? ?([0-9]+[dmy])?(?:\?|$|\.|)/i,
    /(?:how has|what(?:'s| is) the performance of) ([A-Za-z0-9\.\-]+)(?: been| performed| done)(?: in the past| over the last| in the last)? ?([0-9]+[dmy])?(?:\?|$|\.|)/i
  ];
  
  // Check for SEC Filings search patterns
  const secFilingsPatterns = [
    // "Get me the 10-K for Apple"
    /(?:get|find|show|retrieve)(?: me)? (?:the )?(?:most recent |latest )?(10-k|10-q|8-k|10k|10q|8k|annual report|quarterly report)(?: filing| report)?(?: for| from) (.+?)(?:\s|$|\?|\.)/i,
    
    // "Apple 10-K"
    /^([^0-9]+?)(?: )(10-k|10-q|8-k|10k|10q|8k)$/i,
    
    // "10-K for Apple"
    /^(10-k|10-q|8-k|10k|10q|8k)(?: filing| report)?(?: for| from) (.+?)(?:\s|$|\?|\.)/i,
    
    // "latest 10-K for Apple"
    /(?:latest|most recent|current) (10-k|10-q|8-k|10k|10q|8k)(?: filing| report)?(?: for| from) (.+?)(?:\s|$|\?|\.)/i,
    
    // "Can you give me the latest 10k for Tesla"
    /can you (?:get|give|find|show|retrieve)(?: me)? (?:the )?(?:most recent |latest )?(10-k|10-q|8-k|10k|10q|8k)(?: filing| report)?(?: for| from) (.+?)(?:\s|$|\?|\.)/i,
    
    // "10k for Tesla please" - simple format with optional words at the end
    /(10-k|10-q|8-k|10k|10q|8k)(?: for| from) ([^\.]+?)(?:\s|$|\?|\.|please)/i
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

  // Check for Yahoo Finance patterns
  // First check for historical data patterns (special case)
  const historicalPatterns = [
    /(?:show|get|find|give)(?: me)? (?:the )?historical (?:data|performance|prices|chart) (?:for|of) ([A-Za-z0-9\.\-]+)(?: for)?(?: the past)?(?: last)? ?([0-9]+[dmy])?(?:\?|$|\.|)/i,
    /(?:how has|what(?:'s| is) the performance of) ([A-Za-z0-9\.\-]+)(?: been| performed| done)(?: in the past| over the last| in the last)? ?([0-9]+[dmy])?(?:\?|$|\.|)/i
  ];
  
  for (const pattern of historicalPatterns) {
    const match = message.match(pattern);
    
    if (match) {
      const symbol = match[1]?.trim().toUpperCase();
      
      // Check if we have a period specified
      let period = '1mo'; // Default to 1 month
      if (match[2]) {
        period = match[2].trim();
        // Convert e.g. "3m" to "3mo", "1y" to "1y", etc.
        if (period.endsWith('d')) period = period.replace('d', 'd');
        else if (period.endsWith('m')) period = period.replace('m', 'mo');
        else if (period.endsWith('y')) period = period.replace('y', 'y');
      }
      
      console.log(`Historical data pattern matched: Symbol="${symbol}", Period="${period}"`);
      
      return {
        tool: 'yahoo-finance-historical-data',
        params: { symbol, period }
      };
    }
  }
  
  // Then check for stock price patterns
  const pricePatterns = [
    /(?:what(?:'s| is) the )?(?:stock |share |)price(?: of| for) ([A-Za-z0-9\.\-]+)(?:\?|$|\.|)/i,
    /(?:how much (?:is|does) |what(?:'s| is) the value of )([A-Za-z0-9\.\-]+)(?: stock| share| trading at)(?:\?|$|\.|)/i,
    /(?:get|show|tell me|find)(?: me)? (?:the )?([A-Za-z0-9\.\-]+) (?:stock|share) price(?:\?|$|\.|)/i
  ];
  
  for (const pattern of pricePatterns) {
    const match = message.match(pattern);
    
    if (match) {
      const symbol = match[1]?.trim().toUpperCase();
      console.log(`Price pattern matched: Symbol="${symbol}", Metric="regularMarketPrice"`);
      
      return {
        tool: 'yahoo-finance-stock-metric',
        params: { symbol, metric: 'regularMarketPrice' }
      };
    }
  }
  
  // Special case for P/E ratio and common metrics with special characters
  const peRatioPatterns = [
    /(?:what(?:'s| is) the )?(p\/?e ratio|dividend yield|market cap)(?:[a-z\s]*) (?:for|of) ([A-Za-z0-9\.\-]+)(?:\?|$|\.|)/i,
    /(?:what(?:'s| is) )([A-Za-z0-9\.\-]+)(?:'s| company\'s| corporation\'s| stock\'s) (p\/?e ratio|dividend yield|market cap)(?:\?|$|\.|)/i
  ];
  
  for (const pattern of peRatioPatterns) {
    const match = message.match(pattern);
    
    if (match) {
      let symbol, metric;
      
      if (match[2] && (match[1].toLowerCase().includes('p/e') || 
                        match[1].toLowerCase().includes('dividend') || 
                        match[1].toLowerCase().includes('market'))) {
        // Pattern: "what's the P/E ratio for AAPL"
        metric = match[1]?.trim().toLowerCase();
        symbol = match[2]?.trim().toUpperCase();
      } else {
        // Pattern: "what's AAPL's P/E ratio"
        symbol = match[1]?.trim().toUpperCase();
        metric = match[2]?.trim().toLowerCase();
      }
      
      // Map common terms to actual field names
      const metricMap = {
        'p/e ratio': 'trailingPE',
        'pe ratio': 'trailingPE',
        'p e ratio': 'trailingPE',
        'dividend yield': 'dividendYield',
        'dividend': 'dividendYield',
        'market cap': 'marketCap',
        'market capitalization': 'marketCap'
      };
      
      metric = metricMap[metric] || metric;
      
      console.log(`Special metric pattern matched: Symbol="${symbol}", Metric="${metric}"`);
      
      return {
        tool: 'yahoo-finance-stock-metric',
        params: { symbol, metric }
      };
    }
  }
  
  // Finally check for other metric patterns
  for (const pattern of yahooFinancePatterns) {
    const match = message.match(pattern);
    
    if (match) {
      let symbol, metric;
      
      if (match[2] && pattern.toString().includes('for|of')) {
        // Pattern: "what's the revenue for AAPL"
        metric = match[1]?.trim().toLowerCase();
        symbol = match[2]?.trim().toUpperCase();
      } else {
        // Pattern: "what's AAPL's revenue"
        symbol = match[1]?.trim().toUpperCase();
        metric = match[2]?.trim().toLowerCase();
      }
      
      // Map common terms to actual field names
      const metricMap = {
        'price': 'regularMarketPrice',
        'stock price': 'regularMarketPrice',
        'share price': 'regularMarketPrice',
        'revenue': 'totalRevenue',
        'earnings': 'netIncomeToCommon',
        '52 week high': 'fiftyTwoWeekHigh',
        '52 week low': 'fiftyTwoWeekLow'
      };
      
      metric = metricMap[metric] || metric;
      
      console.log(`Metric pattern matched: Symbol="${symbol}", Metric="${metric}"`);
      
      return {
        tool: 'yahoo-finance-stock-metric',
        params: { symbol, metric }
      };
    }
  }

  // Check for SEC filing patterns
  for (const pattern of secFilingsPatterns) {
    const match = message.match(pattern);
    
    if (match) {
      // ... existing SEC filings code ...
    }
  }

  // Check for Companies House patterns
  for (const pattern of companiesHousePatterns) {
    if (pattern.test(message)) {
      // ... existing Companies House code ...
    }
  }

  return null;
}

async function getResponse(message, avatar, previousResponses = [], onUpdate, selectedFiles = []) {
  console.log('Getting response from avatar:', {
    name: avatar.name,
    role: avatar.role,
    id: avatar.id,
    model: avatar.selectedModel,
    capabilities: avatar.capabilities
  });

  // Check if this is the RD Agent (Ada Lovelace) avatar
  if (avatar.id === 'ada-lovelace' || (avatar.capabilities && avatar.capabilities.includes('rd-agent'))) {
    console.log('Using RD Agent for predictive modeling with Ada Lovelace');
      try {
      // Send initial thinking update
        if (onUpdate) {
          onUpdate({
          response: `I'm analyzing your request and preparing to assist with predictive modeling...`,
          thinkingContent: "Initializing predictive modeling capabilities..."
        });
      }
      
      // Forward the request to the RD Agent service
      const rdAgentResponse = await forwardToRDAgent(message, avatar, selectedFiles);
                    
      // Update the client with the response
            if (onUpdate) {
        onUpdate({
          response: rdAgentResponse.response || "I've completed the analysis of your request."
              });
            }
            
            return {
              responses: [{
                avatarId: avatar.id,
                avatarName: avatar.name,
          response: rdAgentResponse.response || "I'm ready to help with your predictive modeling needs. To get started, please upload a dataset or describe the analysis you'd like to perform.",
          isThinking: false
              }]
            };
          } catch (error) {
      console.error('Error connecting to RD Agent service:', error);
                  
      // Fallback response if RD Agent is unavailable
        return {
          responses: [{
            avatarId: avatar.id,
            avatarName: avatar.name,
          response: "I'm currently having trouble connecting to my predictive modeling capabilities. Please try again later, or continue with a different type of request.",
          isThinking: false
        }]
      };
    }
  }

  // Regular avatar response processing
  try {
    // For non-Ada Lovelace avatars, use standard LLM processing
    if (onUpdate) {
      onUpdate({
        response: `I'm thinking about your message...`,
        isThinking: true,
        thinkingContent: "Analyzing your request..."
      });
    }
    
    // Prepare system message with avatar's personality
    const systemMessage = `You are ${avatar.name}, ${avatar.role || 'a helpful assistant'}. ${avatar.description || ''}`;
    
    // Format previous messages for context
    let contextMessages = '';
    if (previousResponses && previousResponses.length > 0) {
      contextMessages = previousResponses.map(m => 
        `${m.avatar || 'User'}: ${m.message}`
      ).join('\n');
    }
    
    // Build the prompt
    let prompt = systemMessage;
    if (contextMessages) {
      prompt += `\n\nHere's the conversation so far:\n${contextMessages}\n\n`;
    }
    prompt += `\nUser: ${message}\n\n${avatar.name}:`;
    
    // Get response from the model
    const modelConfig = {
      type: avatar.selectedModel ? avatar.selectedModel.split(':')[0] : 'openai',
      model: avatar.selectedModel ? avatar.selectedModel.split(':')[1] : 'gpt-3.5-turbo'
    };
    
    // Log the model being used
    console.log(`Using model: ${modelConfig.type}:${modelConfig.model} for ${avatar.name}`);
    
    // Send interim updates if this is going to take a while
    let intervalId;
    if (onUpdate) {
      let dots = 0;
      intervalId = setInterval(() => {
        dots = (dots + 1) % 4;
        const dotString = '.'.repeat(dots);
        onUpdate({
          response: `Thinking${dotString}`,
          isThinking: true,
          thinkingContent: `Processing your request with ${modelConfig.model}${dotString}`
        });
      }, 1500);
    }
    
    // Get response from the appropriate model
    let responseText;
    try {
      responseText = await getResponseFromModel(prompt, modelConfig);
    } finally {
      // Clear the interval when we have a response
      if (intervalId) clearInterval(intervalId);
    }
    
    // Process the response
    if (onUpdate) {
      onUpdate({
        response: responseText,
        isThinking: false
      });
    }
    
    // Return in the expected format
    return {
      responses: [{
        avatarId: avatar.id,
        avatarName: avatar.name,
        response: responseText,
        isThinking: false
      }]
    };
  } catch (error) {
    console.error(`Error getting response for ${avatar.name}:`, error);
    
    // Return error response in expected format
    return {
      responses: [{
        avatarId: avatar.id,
        avatarName: avatar.name,
        response: `I'm sorry, I encountered an error: ${error.message}. Please try again.`,
        isThinking: false,
        error: true
      }]
    };
  }
}

// Function to forward requests to the RD Agent service
async function forwardToRDAgent(message, avatar, selectedFiles = []) {
  try {
    // Get RD Agent endpoint from environment variable or use dynamic port discovery
    const rdAgentPort = process.env.WRAPPER_PORT || 3002;
    const rdAgentEndpoints = [
      `http://localhost:${rdAgentPort}`,
      'http://localhost:3051',
      'http://localhost:3052',
      'http://localhost:3053'
    ];
    
    console.log(`Attempting to connect to RD Agent on ports: ${rdAgentEndpoints.map(e => e.split(':')[2]).join(', ')}`);
    
    // Check if the file path is directly provided in the message
    const filePathRegex = /(?:analyze|check|examine|process|dataset at|file at|data at) ((?:\/[^\/]+)+\.[a-zA-Z0-9]+)/i;
    const filePathMatch = message.match(filePathRegex);
    
    if (filePathMatch && filePathMatch[1]) {
      const filePath = filePathMatch[1];
      console.log(`Detected file path in message: ${filePath}`);
      
      // Try connecting to different possible RD Agent endpoints
      let connected = false;
      let response = null;
      
      for (const endpoint of rdAgentEndpoints) {
        try {
          console.log(`Trying to connect to RD Agent at: ${endpoint}`);
          
          // Check if the endpoint is available
          await axios.get(`${endpoint}/health`, { timeout: 1000 });
          console.log(`RD Agent is available at: ${endpoint}`);
          
          // Use the analyze-local-file endpoint
          response = await axios.post(`${endpoint}/api/analyze-local-file`, {
            filePath: filePath,
            task: message.toLowerCase().includes('predict') ? 'prediction' : 'data_analysis',
            message: message
          }, { timeout: 30000 });
          
          connected = true;
          console.log(`Successfully connected to RD Agent at: ${endpoint}`);
          break;
        } catch (err) {
          console.log(`Failed to connect to RD Agent at ${endpoint}: ${err.message}`);
        }
      }
      
      if (!connected) {
        console.error('Could not connect to any RD Agent endpoint');
        return {
          response: `I'm having trouble connecting to the analysis service. Please try again later or check if the service is running.`
        };
      }
      
      if (response && response.data && response.data.jobId) {
        return {
          response: `I'm analyzing your dataset at ${filePath}. This may take a moment. Your analysis job ID is ${response.data.jobId}. You can ask me about the results by saying "Check job ID ${response.data.jobId}".`,
          jobId: response.data.jobId
        };
      }
      
      return {
        response: `I started analyzing your file at ${filePath}, but didn't receive a job ID. Please try again or provide a different file path.`
      };
    }
    
    // If user asks to upload a dataset
    if (message.toLowerCase().includes("upload") && 
        (message.toLowerCase().includes("dataset") || 
         message.toLowerCase().includes("data") || 
         message.toLowerCase().includes("file") || 
         message.toLowerCase().includes("csv"))) {
      return {
        response: "To analyze your data, please upload a dataset file (CSV, JSON, Excel, or Parquet format) using the file upload button, or provide the full path to a file on your computer if the dataset is very large."
      };
    }
    
    // Determine if there's a dataset in the selected files
    const datasetFiles = selectedFiles.filter(file => {
      const lowerFilename = file.filename?.toLowerCase() || '';
      return lowerFilename.endsWith('.csv') || 
             lowerFilename.endsWith('.json') ||
             lowerFilename.endsWith('.xlsx') ||
             lowerFilename.endsWith('.xls') ||
             lowerFilename.endsWith('.parquet') ||
             lowerFilename.endsWith('.tsv');
    });
    
    console.log(`Found ${datasetFiles.length} data files in the selected files`);
    
    // Forward the request to the appropriate RD Agent endpoint
    if (datasetFiles.length > 0) {
      // If dataset is uploaded, forward to data analysis endpoint
      console.log('Dataset detected in selected files, forwarding to RD Agent');
      
      try {
        // Get actual file paths for the dataset files
        console.log('Selected files:', selectedFiles);
        
        const filePaths = [];
        for (const file of datasetFiles) {
          let filePath = null;
          
          // Try different ways to get the file path
          if (file.path) {
            filePath = file.path;
          } else if (file.storagePath) {
            filePath = file.storagePath;
          } else if (file.id) {
            // Construct path based on ID and storage location
            filePath = path.join(__dirname, '../../storage/uploads', file.filename);
          } else if (typeof file === 'string') {
            filePath = file;
          }
          
          if (filePath) {
            // Check if file exists
            try {
              await fs.promises.access(filePath, fs.constants.R_OK);
              filePaths.push(filePath);
              console.log(`File exists and is readable: ${filePath}`);
            } catch (err) {
              console.error(`File not accessible: ${filePath}`, err);
            }
          }
        }
        
        if (filePaths.length === 0) {
          return {
            response: "I found your dataset files, but I'm having trouble accessing them. Please make sure the files are properly uploaded and try again."
          };
        }
        
        // Make request to RD Agent with file paths
        console.log(`Sending ${filePaths.length} files to RD Agent:`, filePaths);
        
        // Extract task from message - default to data_analysis if not specified
        let task = 'data_analysis';
        if (message.toLowerCase().includes('predict')) {
          task = 'prediction';
        } else if (message.toLowerCase().includes('cluster')) {
          task = 'clustering';
        } else if (message.toLowerCase().includes('classify')) {
          task = 'classification';
        }
        
        // Try connecting to different possible RD Agent endpoints
        let connected = false;
        let rdAgentResponse = null;
        
        for (const endpoint of rdAgentEndpoints) {
          try {
            console.log(`Trying to connect to RD Agent at: ${endpoint}`);
            
            // Check if the endpoint is available
            await axios.get(`${endpoint}/health`, { timeout: 1000 });
            console.log(`RD Agent is available at: ${endpoint}`);
            
            // Make request to RD Agent with file paths
            rdAgentResponse = await axios.post(`${endpoint}/api/run-flow`, {
              task: task,
              message: message,
              filePaths: filePaths,
              avatarId: avatar.id
            }, {
              timeout: 30000
            });
            
            connected = true;
            console.log(`Successfully connected to RD Agent at: ${endpoint}`);
            break;
          } catch (err) {
            console.log(`Failed to connect to RD Agent at ${endpoint}: ${err.message}`);
          }
        }
        
        if (!connected) {
          console.error('Could not connect to any RD Agent endpoint');
          return {
            response: `I'm having trouble connecting to the analysis service. Please try again later or check if the service is running.`
          };
        }
        
        if (rdAgentResponse && rdAgentResponse.data && rdAgentResponse.data.jobId) {
          return {
            response: `I'm analyzing your dataset now. This may take a moment. Your analysis job ID is ${rdAgentResponse.data.jobId}. You can ask me about the results by saying "Check job ID ${rdAgentResponse.data.jobId}".`,
            jobId: rdAgentResponse.data.jobId
          };
        }
        
        return {
          response: "I've received your dataset and started the analysis. What specific insights would you like me to look for? For example, I can identify patterns, build predictive models, or generate visualizations from this data."
        };
      } catch (error) {
        console.error('Error forwarding request to RD Agent:', error);
        return {
          response: `I encountered an issue while processing your dataset: ${error.message}. Please check that the file format is correct and try again.`
        };
      }
    }
    
    // Default response if no dataset
    return {
      response: "I'm ready to help with your predictive modeling needs. To get started, please upload a dataset file (CSV, JSON, Excel, or Parquet format) so I can analyze it and help you build a model."
    };
  } catch (error) {
    console.error('Error connecting to RD Agent service:', error);
    return {
      response: "I'm having trouble connecting to the analysis service. Please try again later."
    };
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

async function processFunctionCall(message, functionCall, mcpServer) {
  try {
    console.log('Processing function call:', functionCall);
    
    // Extract the function name and arguments
    const functionName = functionCall.name;
    let args = {};
    
    try {
      args = JSON.parse(functionCall.arguments);
    } catch (error) {
      console.error('Error parsing function arguments:', error);
      return {
        error: true,
        message: `Error parsing function arguments: ${error.message}`
      };
    }
    
    // Execute the function using the MCP server
    const result = await mcpServer.executeFunction(functionName, args);
    
    // Format the result for display
    let formattedResult = '';
    
    // Handle different result formats
    if (result.content && Array.isArray(result.content)) {
      // Standard MCP format
      formattedResult = result.content
        .map(item => item.text || JSON.stringify(item))
        .join('\n');
    } else if (result.status === "OK" && result.data) {
      // SEC filings and similar formats
      formattedResult = JSON.stringify(result.data, null, 2);
    } else {
      // Fall back to simple stringification
      formattedResult = JSON.stringify(result, null, 2);
    }
    
    // Format the result specifically for different tools
    if (functionName === 'google_weather') {
      // Extract and format weather data
      try {
        const weatherData = JSON.parse(formattedResult);
        formattedResult = formatWeatherResponse(weatherData);
      } catch (e) {
        // Keep the original format if parsing fails
        console.error('Failed to format weather data:', e);
      }
    } else if (functionName === 'sec_filings') {
      // Format SEC filings data
      try {
        const filingsData = JSON.parse(formattedResult);
        formattedResult = formatSecFilingsResponse(filingsData);
      } catch (e) {
        console.error('Failed to format SEC filings data:', e);
      }
    } else if (functionName.startsWith('yahoo_finance')) {
      // Format Yahoo Finance data
      try {
        const financeData = JSON.parse(formattedResult);
        formattedResult = formatYahooFinanceResponse(functionName, financeData);
      } catch (e) {
        console.error('Failed to format Yahoo Finance data:', e);
      }
    }
    
    return formattedResult;
    
  } catch (error) {
    console.error('Error executing function call:', error);
    return {
      error: true,
      message: `Error executing function: ${error.message}`
    };
  }
}

// Helper function to format weather responses
function formatWeatherResponse(data) {
  if (!data || !data.location) return JSON.stringify(data, null, 2);
  
  let formatted = `Weather for ${data.location}:\n\n`;
  
  // Add current weather
  if (data.current) {
    formatted += `Current conditions: ${data.current.condition}, ${data.current.temperature}°C`;
    formatted += `\nFeels like: ${data.current.feels_like}°C`;
    formatted += `\nHumidity: ${data.current.humidity}%`;
    formatted += `\nWind: ${data.current.wind_speed} km/h ${data.current.wind_direction}`;
  }
  
  // Add forecast
  if (data.forecast && data.forecast.length > 0) {
    formatted += '\n\nForecast:\n';
    data.forecast.forEach(day => {
      formatted += `\n${day.date}: ${day.condition}, ${day.temperature.min}°C to ${day.temperature.max}°C`;
      formatted += `, ${day.precipitation}% chance of precipitation`;
    });
  }
  
  return formatted;
}

// Helper function to format SEC filings responses
function formatSecFilingsResponse(data) {
  if (!data) return 'No filing data available';
  
  if (data.error) {
    return `Error retrieving SEC filings: ${data.error}`;
  }
  
  const filings = Array.isArray(data) ? data : data.filings || data.data || [];
  
  if (filings.length === 0) {
    return 'No SEC filings found matching your criteria.';
  }
  
  let formatted = `SEC filings found:\n\n`;
  
  filings.forEach((filing, idx) => {
    formatted += `${idx + 1}. ${filing.filing_type} (${filing.filing_date}): ${filing.description}\n`;
  });
  
  return formatted;
}

// Helper function to format Yahoo Finance responses
function formatYahooFinanceResponse(functionName, data) {
  if (!data) return 'No financial data available';
  
  if (data.error) {
    return `Error retrieving financial data: ${data.error}`;
  }
  
  let formatted = '';
  
  if (functionName === 'yahoo_finance_stock_metric') {
    const symbol = data.symbol || 'Unknown';
    formatted = `Financial data for ${data.longName || symbol} (${symbol}):\n\n`;
    
    // Format based on the metric
    if (data.regularMarketPrice || data.currentPrice) {
      const price = data.regularMarketPrice || data.currentPrice;
      formatted += `Current Price: $${price.toFixed(2)}\n`;
      
      if (data.regularMarketChangePercent) {
        const changeDirection = data.regularMarketChangePercent > 0 ? '📈' : '📉';
        formatted += `Change: ${changeDirection} ${data.regularMarketChangePercent.toFixed(2)}%\n`;
      }
    }
    
    if (data.marketCap) {
      const marketCapInBillions = data.marketCap / 1000000000;
      if (marketCapInBillions >= 1) {
        formatted += `Market Cap: $${marketCapInBillions.toFixed(2)} billion\n`;
      } else {
        const marketCapInMillions = data.marketCap / 1000000;
        formatted += `Market Cap: $${marketCapInMillions.toFixed(2)} million\n`;
      }
    }
    
    // Add other metrics if available
    const metricsMap = {
      'trailingPE': 'P/E Ratio',
      'dividendYield': 'Dividend Yield',
      'fiftyTwoWeekHigh': '52-Week High',
      'fiftyTwoWeekLow': '52-Week Low'
    };
    
    for (const [key, label] of Object.entries(metricsMap)) {
      if (data[key] !== undefined) {
        formatted += `${label}: ${data[key]}\n`;
      }
    }
    
  } else if (functionName === 'yahoo_finance_historical_data') {
    const symbol = data.symbol || 'Unknown';
    const period = data.period || 'recent period';
    
    formatted = `Historical data for ${symbol} over the ${period}:\n\n`;
    
    if (data.historicalData && data.historicalData.length > 0) {
      // Add a summary table
      formatted += "Date        | Open    | Close   | % Change\n";
      formatted += "------------|---------|---------|----------\n";
      
      // Show only the first 5 entries for brevity
      const displayData = data.historicalData.slice(0, 5);
      displayData.forEach(point => {
        const date = new Date(point.date).toLocaleDateString();
        const open = `$${point.open.toFixed(2)}`;
        const close = `$${point.close.toFixed(2)}`;
        const change = ((point.close - point.open) / point.open * 100).toFixed(2);
        const changeFormatted = change > 0 ? `+${change}%` : `${change}%`;
        
        formatted += `${date.padEnd(12)} | ${open.padEnd(8)} | ${close.padEnd(8)} | ${changeFormatted}\n`;
      });
      
      if (data.historicalData.length > 5) {
        formatted += `\n... and ${data.historicalData.length - 5} more data points.`;
      }
    } else {
      formatted += "No historical data available for this period.";
    }
  }
  
  return formatted;
}

/**
 * Detects and fixes Vega-Lite specifications that are missing the required markers
 * @param {string} response - The response text from the LLM
 * @returns {string} - The response with properly formatted Vega-Lite specifications
 */
function ensureVegaLiteMarkers(response) {
  if (!response) return response;
  
  // First, check if there are already properly formatted specs
  if (response.includes('[GRAPH_START]') && response.includes('[GRAPH_END]')) {
    return response;
  }
  
  // Look for potential Vega-Lite specs (JSON objects with Vega-Lite characteristics)
  const jsonBlockRegex = /```(?:json|vega-lite)?\s*({[\s\S]*?})```/g;
  
  return response.replace(jsonBlockRegex, (match, jsonContent) => {
    try {
      const parsed = JSON.parse(jsonContent);
      
      // Check if this looks like a Vega-Lite spec
      if (
        parsed && 
        (
          // Has data property
          (parsed.data || parsed.url || (parsed.datasets && Object.keys(parsed.datasets).length > 0)) &&
          // Has mark or is a composite visualization
          (parsed.mark !== undefined || parsed.layer || parsed.hconcat || parsed.vconcat || parsed.facet) &&
          // Has encoding or is a composite visualization
          (parsed.encoding || parsed.layer || parsed.hconcat || parsed.vconcat || parsed.facet)
        )
      ) {
        console.log('Found unmarked Vega-Lite spec, adding markers');
        return `[GRAPH_START]\n${jsonContent}\n[GRAPH_END]`;
      }
    } catch (e) {
      // Not valid JSON, return the original match
      console.log('Failed to parse potential Vega-Lite spec:', e.message);
    }
    
    return match;
  });
}

module.exports = {
  getResponse,
  detectToolRequest,
  processFunctionCall,
  extractCompanyName,
  downloadFileFromUrl,
};