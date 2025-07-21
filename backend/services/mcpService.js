const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');
const axios = require('axios');
const { createFileFromExternalSource } = require('./fileService');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const os = require('os');
// Import Yahoo Finance integration
const yahooFinance = require('./yahoo-finance-mcp-integration');

// Initialize cache for API responses
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
let lastSECApiCall = null;

// Create cache directory for SEC filings
const cacheDir = path.join(os.tmpdir(), 'llm-chat-sec-cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// User agent string for SEC API requests (required by SEC EDGAR)
const userAgentString = `LLM-Chat/${process.env.SEC_APP_NAME || 'SEC API Integration'} Contact: ${process.env.SEC_CONTACT_EMAIL || 'example@example.com'}`;

// Create MCP server
const server = new McpServer({
  name: "llm-chat-mcp-server",
  version: "1.0.0"
});

// Google Maps Places search tool
server.tool(
  "google-maps-search",
  { 
    query: z.string().describe("The search query for finding places"),
    location: z.string().optional().describe("Optional location bias in 'latitude,longitude' format"),
    type: z.enum(['restaurant', 'cafe', 'park', 'museum', 'hotel', 'any']).optional().default('any').describe("Type of place to search for")
  },
  async ({ query, location, type }) => {
    try {
      console.log(`Executing Google Maps search for: ${query}`);
      
      // In a real implementation, you would use the actual Google Maps API
      // This is a mock implementation for demonstration purposes
      const mockResponse = await mockGoogleMapsSearch(query, location, type);
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(mockResponse, null, 2)
        }]
      };
    } catch (error) {
      console.error("Google Maps search error:", error);
      return {
        content: [{ 
          type: "text", 
          text: `Error searching Google Maps: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Google Weather tool
server.tool(
  "google-weather",
  {
    location: z.string().describe("Location to get weather for (city, address, or lat/lng)"),
    days: z.number().optional().default(1).describe("Number of days for forecast (1-7)")
  },
  async ({ location, days }) => {
    try {
      console.log(`Executing Google Weather search for: ${location}, days: ${days}`);
      
      // In a real implementation, you would use an actual Weather API
      // This is a mock implementation for demonstration purposes
      const mockResponse = await mockWeatherSearch(location, days);
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(mockResponse, null, 2)
        }]
      };
    } catch (error) {
      console.error("Weather search error:", error);
      return {
        content: [{ 
          type: "text", 
          text: `Error retrieving weather: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// SEC Filings tool
server.tool(
  "sec-filings",
  {
    company: z.string().describe("Company name or ticker symbol"),
    filingType: z.enum(['10-K', '10-Q', '8-K', 'ALL']).optional().default('ALL').describe("Type of SEC filing to search for"),
    limit: z.number().optional().default(5).describe("Maximum number of results to return"),
    download_id: z.string().optional().describe("The ID of a specific filing to download")
  },
  async ({ company, filingType, limit, download_id }) => {
    // SEC EDGAR API implementation
    // This integration allows searching for SEC filings by CIK number
    // and downloading filing documents directly from the SEC website
    // Complies with SEC API guidelines: 10 requests/second rate limit,
    // appropriate User-Agent headers, and response caching
    if (download_id) {
      // Extract filing data from the ID (format: TICKER-TYPE-DATE)
      const parts = download_id.split('-');
      if (parts.length >= 3) {
        const ticker = parts[0];
        const filing_type = parts[1];
        const filing_date = parts.slice(2).join('-');
        
        const filingData = {
          company_name: company || `${ticker} Corporation`,
          ticker_symbol: ticker,
          filing_type,
          filing_date,
          description: filing_type === '10-K' ? 'Annual Report' : (filing_type === '10-Q' ? 'Quarterly Report' : 'Report'),
          filing_url: `https://example.com/sec/${ticker}/${download_id}.pdf`,
          filing_id: download_id
        };
        
        return await downloadSECFiling(filingData);
      }
      
      return {
        status: "ERROR",
        message: "Invalid filing ID format"
      };
    }
    
    // Use the real SEC API implementation
    return await secFilingsSearch(company, filingType, limit);
  }
);

// Companies House Filings tool
server.tool(
  "companies-house",
  {
    company: z.string().describe("Company name or registration number"),
    filingType: z.enum(['ACCOUNTS', 'ANNUAL_RETURN', 'INCORPORATION', 'OFFICERS', 'CHARGES', 'ALL']).optional().default('ALL').describe("Type of filing to search for"),
    limit: z.number().optional().default(5).describe("Maximum number of results to return"),
    download_id: z.string().optional().describe("The ID of a specific filing to download")
  },
  async ({ company, filingType, limit, download_id }) => {
    if (download_id) {
      // Extract filing data from the ID (format: CH-NUMBER-DATE)
      const parts = download_id.split('-');
      if (parts.length >= 3 && parts[0] === 'CH') {
        const company_number = parts[1];
        const filing_date = parts.slice(2).join('-');
        
        const filingData = {
          company_name: company || `UK Company ${company_number}`,
          company_number,
          filing_type: filingType || 'Company Filing',
          filing_date,
          filing_description: `${filingType || 'Company Filing'} for ${company || `UK Company ${company_number}`}`,
          filing_url: `https://example.com/companies-house/${company_number}/${download_id}.pdf`,
          filing_id: download_id
        };
        
        return await downloadCompaniesHouseFiling(filingData);
      }
      
      return {
        status: "ERROR",
        message: "Invalid filing ID format"
      };
    }
    
    return await mockCompaniesHouseSearch(company, filingType, limit);
  }
);

// Yahoo Finance Stock Metric Tool
server.tool(
  "yahoo-finance-stock-metric",
  {
    symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT', 'TSLA')"),
    metric: z.string().describe("Stock metric to retrieve (e.g., 'currentPrice', 'marketCap', 'trailingPE')")
  },
  async ({ symbol, metric }) => {
    try {
      console.log(`Executing Yahoo Finance stock metric lookup for: ${symbol}, metric: ${metric}`);
      
      // Check if the Yahoo Finance MCP server is available
      const isAvailable = await yahooFinance.isYahooFinanceMcpAvailable();
      if (!isAvailable) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              error: "Yahoo Finance MCP server is not available. Please ensure it is running." 
            }, null, 2)
          }],
          isError: true
        };
      }
      
      // Call the Yahoo Finance MCP integration service
      return await yahooFinance.getStockMetric({ symbol, metric });
    } catch (error) {
      console.error("Yahoo Finance stock metric lookup error:", error);
      return {
        content: [{ 
          type: "text", 
          text: `Error fetching Yahoo Finance data: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Yahoo Finance Historical Data Tool
server.tool(
  "yahoo-finance-historical-data",
  {
    symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT', 'TSLA')"),
    period: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']).optional().default('1mo').describe("Time period for historical data")
  },
  async ({ symbol, period }) => {
    try {
      console.log(`Executing Yahoo Finance historical data lookup for: ${symbol}, period: ${period}`);
      
      // Check if the Yahoo Finance MCP server is available
      const isAvailable = await yahooFinance.isYahooFinanceMcpAvailable();
      if (!isAvailable) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              error: "Yahoo Finance MCP server is not available. Please ensure it is running." 
            }, null, 2)
          }],
          isError: true
        };
      }
      
      // Call the Yahoo Finance MCP integration service
      return await yahooFinance.getHistoricalData({ symbol, period });
    } catch (error) {
      console.error("Yahoo Finance historical data lookup error:", error);
      return {
        content: [{ 
          type: "text", 
          text: `Error fetching Yahoo Finance historical data: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Mock function - replace with actual Google Maps API call in production
async function mockGoogleMapsSearch(query, location, type) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate mock data based on query
  const results = [];
  const locationCoords = location ? location.split(',').map(coord => parseFloat(coord.trim())) : [37.7749, -122.4194]; // Default to SF
  
  // Create 3 mock results
  for (let i = 0; i < 3; i++) {
    // Add small random offset to location for variety
    const lat = locationCoords[0] + (Math.random() - 0.5) * 0.02;
    const lng = locationCoords[1] + (Math.random() - 0.5) * 0.02;
    
    results.push({
      name: `${query} ${type !== 'any' ? type : 'place'} ${i + 1}`,
      address: `${100 + i} Main St, Example City`,
      rating: (3 + Math.random() * 2).toFixed(1),
      location: {
        lat,
        lng
      },
      types: type !== 'any' ? [type] : ['establishment', 'point_of_interest'],
      open_now: Math.random() > 0.5
    });
  }
  
  return {
    results,
    status: "OK",
    search_metadata: {
      query,
      location: locationCoords,
      type: type
    }
  };
}

// Mock function for Weather API
async function mockWeatherSearch(location, days) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  const weatherConditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm', 'Snow', 'Foggy'];
  const forecast = [];
  
  // Generate forecast for requested number of days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      temperature: {
        min: Math.floor(10 + Math.random() * 15),
        max: Math.floor(20 + Math.random() * 15),
        unit: 'C'
      },
      precipitation: Math.floor(Math.random() * 100),
      humidity: Math.floor(40 + Math.random() * 50),
      wind: {
        speed: Math.floor(5 + Math.random() * 30),
        direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)]
      }
    });
  }
  
  return {
    location: location,
    current: {
      temperature: Math.floor(15 + Math.random() * 20),
      feels_like: Math.floor(15 + Math.random() * 20),
      condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      humidity: Math.floor(40 + Math.random() * 50),
      wind_speed: Math.floor(5 + Math.random() * 30),
      wind_direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
      last_updated: new Date().toISOString()
    },
    forecast: forecast,
    status: "OK"
  };
}

// Real implementation for SEC Filings search using SEC EDGAR API
async function secFilingsSearch(company, filingType, limit = 5) {
  console.log(`Looking up company: "${company}" using SEC company tickers list`);
  
  try {
    // Validate inputs
    if (!company) {
      throw new Error("Company name or ticker symbol is required");
    }
    
    // Normalize filing type
    if (filingType) {
      if (filingType.toLowerCase() === '10k' || filingType.toLowerCase() === 'annual report') {
        filingType = '10-K';
      } else if (filingType.toLowerCase() === '10q' || filingType.toLowerCase() === 'quarterly report') {
        filingType = '10-Q';
      } else if (filingType.toLowerCase() === '8k') {
        filingType = '8-K';
      }
    }
    
    // Remove "please" from company name if present
    if (company.toLowerCase().endsWith(' please')) {
      company = company.substring(0, company.length - 7).trim();
    }
    
    // Check cache for this query
    const cacheKey = `sec_${company}_${filingType}`;
    try {
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        console.log(`Returning cached SEC filing search results for ${company}`);
        return cachedResult;
      }
    } catch (cacheError) {
      console.error('Cache error, continuing with live lookup:', cacheError);
      // Continue with the search even if cache fails
    }
    
    // Implement basic rate limiting
    const now = Date.now();
    if (lastSECApiCall && now - lastSECApiCall < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    lastSECApiCall = Date.now();
    
    // Determine if input is CIK number or company name
    const isCIK = /^\d+$/.test(company);
    let companyInfo;
    let ticker;
    
    try {
      if (!isCIK) {
        // Try to look up the company info by ticker or name
        const response = await axios.get('https://www.sec.gov/files/company_tickers.json', {
          headers: {
            'User-Agent': userAgentString
          },
          timeout: 10000 // 10 second timeout
        });
        
        const companies = Object.values(response.data);
        
        // Check if the input matches a ticker symbol (case insensitive)
        const tickerMatch = companies.find(c => 
          c.ticker.toLowerCase() === company.toLowerCase()
        );
        
        // If no ticker match, check if the input is part of a company name
        if (tickerMatch) {
          companyInfo = tickerMatch;
          ticker = tickerMatch.ticker;
        } else {
          // Try to find the company by name (partial match)
          const nameMatch = companies.find(c => 
            c.title.toLowerCase().includes(company.toLowerCase())
          );
          
          if (nameMatch) {
            companyInfo = nameMatch;
            ticker = nameMatch.ticker;
          } else {
            // No match found, try to get a suggestion
            const suggestedCompany = await getSuggestedCompany(company, companies);
            if (suggestedCompany) {
              throw new Error(`Company "${company}" not found. Did you mean "${suggestedCompany.title}" (${suggestedCompany.ticker})?`);
            } else {
              throw new Error(`Company "${company}" not found. Try searching by CIK number or exact ticker symbol.`);
            }
          }
        }
      } else {
        // Use the CIK directly
        companyInfo = { cik_str: parseInt(company, 10) };
      }

      // Form the submissions URL
      const cik = companyInfo.cik_str.toString().padStart(10, '0');
      const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
      
      console.log(`Fetching submissions for CIK: ${cik}`);
      
      // Fetch submissions data
      const submissionsResponse = await axios.get(submissionsUrl, {
        headers: {
          'User-Agent': userAgentString
        },
        timeout: 15000 // 15 second timeout
      });
      
      // Save submissions to cache file
      const submissionsData = submissionsResponse.data;
      
      // Get recent filings with the requested type
      const filings = [];
      
      if (submissionsData.filings && submissionsData.filings.recent) {
        const recentFilings = submissionsData.filings.recent;
        
        if (recentFilings.form && recentFilings.form.length > 0) {
          for (let i = 0; i < recentFilings.form.length; i++) {
            if (!filingType || recentFilings.form[i] === filingType) {
              if (filings.length < limit) {
                const accessionNumber = recentFilings.accessionNumber[i];
                const filing = {
                  company_name: submissionsData.name,
                  ticker_symbol: ticker || "Unknown",
                  filing_type: recentFilings.form[i],
                  filing_date: recentFilings.filingDate[i],
                  report_date: recentFilings.reportDate[i] || recentFilings.filingDate[i],
                  filing_url: `https://www.sec.gov/Archives/edgar/data/${submissionsData.cik}/${accessionNumber.replace(/-/g, '')}/` + 
                              `${accessionNumber.replace(/-/g, '')}.txt`,
                  description: getFilingDescription(recentFilings.form[i]),
                  filing_id: `${ticker || submissionsData.cik}-${recentFilings.form[i]}-${recentFilings.filingDate[i]}`,
                  accession_number: accessionNumber,
                  has_downloadable_file: true
                };
                
                filings.push(filing);
              }
            }
          }
        }
      }
      
      if (filings.length === 0) {
        throw new Error(`No ${filingType || ''} filings found for ${company}`);
      }
      
      const result = {
        status: "OK",
        data: filings,
        is_mock: false
      };
      
      // Cache the result
      try {
        cache.set(cacheKey, result, 3600); // Cache for 1 hour
      } catch (cacheError) {
        console.error('Failed to cache SEC result:', cacheError);
      }
      
      return result;
    } catch (error) {
      // Handle specific error cases with user-friendly messages
      if (error.response && error.response.status === 429) {
        throw new Error("SEC API rate limit exceeded. Please try again in a few minutes.");
      } else if (error.code === 'ECONNABORTED') {
        throw new Error("SEC API request timed out. The service may be experiencing high traffic.");
      } else if (error.code === 'ENOTFOUND') {
        throw new Error("Unable to connect to SEC API. Please check your internet connection.");
      } else {
        // Re-throw the original error with proper context
        throw error;
      }
    }
  } catch (error) {
    console.error('Error looking up company information:', error);
    throw error;
  }
}

// Helper function to get filing descriptions
function getFilingDescription(filingType) {
  const descriptions = {
    "10-K": "Annual Report",
    "10-Q": "Quarterly Report",
    "8-K": "Current Report",
    "S-1": "Registration Statement",
    "4": "Statement of Changes in Beneficial Ownership",
    "13F": "Institutional Investment Manager Holdings Report",
    "DEF 14A": "Definitive Proxy Statement"
  };
  
  return descriptions[filingType] || `${filingType} Filing`;
}

// Mock function for Companies House
async function mockCompaniesHouseSearch(company, filingType, limit = 5) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 900));
  
  // Generate mock data
  const companyName = company || "Example UK Ltd";
  const companyNumber = Math.floor(Math.random() * 10000000).toString().padStart(8, '0');
  
  const filings = [];
  const filingTypes = filingType 
    ? [filingType] 
    : ["Annual Accounts", "Confirmation Statement", "Change of Directors", "Articles of Association"];
  
  // Current date
  const currentDate = new Date();
  
  for (let i = 0; i < limit; i++) {
    const randomFilingType = filingTypes[Math.floor(Math.random() * filingTypes.length)];
    
    // Date is spaced out by 3 months for each filing
    const filingDate = new Date(currentDate);
    filingDate.setMonth(filingDate.getMonth() - (i * 3));
    
    const filingDateStr = filingDate.toISOString().split('T')[0];
    const filingId = `CH-${companyNumber}-${filingDateStr}`;
    const filingUrl = `https://example.com/companies-house/${companyNumber}/${filingId}.pdf`;
    
    filings.push({
      company_name: companyName,
      company_number: companyNumber,
      filing_type: randomFilingType,
      filing_date: filingDateStr,
      filing_description: `${randomFilingType} for ${companyName}`,
      filing_url: filingUrl,
      filing_id: filingId,
      has_downloadable_file: true  // Indicate file can be downloaded
    });
  }
  
  return {
    status: "OK",
    data: filings
  };
}

async function downloadCompaniesHouseFiling(filingData) {
  // This would normally download from the real Companies House API
  // For mock purposes, we'll generate a simple PDF-like content
  try {
    // Mock file content - simulate a simple PDF structure for demo purposes
    const fileContent = Buffer.from(`%PDF-1.5
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 700 Td
(Companies House - ${filingData.company_name}) Tj
0 -20 Td
(Company Number: ${filingData.company_number}) Tj
0 -20 Td
(Filing Type: ${filingData.filing_type}) Tj
0 -20 Td
(Filing Date: ${filingData.filing_date}) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R /Size 5 >>
%%EOF`);

    // Save the file using the fileService
    const fileName = `${filingData.company_name} ${filingData.filing_type} ${filingData.filing_date}.pdf`;
    
    const savedFile = await createFileFromExternalSource({
      content: fileContent,
      fileName,
      sourceType: 'companies-house',
      fileType: 'PDF',
      metadata: {
        company: filingData.company_name,
        company_number: filingData.company_number,
        filing_type: filingData.filing_type,
        filing_date: filingData.filing_date,
        description: filingData.filing_description,
        filing_id: filingData.filing_id
      }
    });
    
    return {
      status: "OK",
      file: savedFile,
      message: `Companies House filing ${filingData.filing_type} for ${filingData.company_name} saved as ${fileName}`
    };
  } catch (error) {
    console.error("Error downloading Companies House filing:", error);
    return {
      status: "ERROR",
      message: `Failed to download Companies House filing: ${error.message}`
    };
  }
}

// Placeholder for the actual Google Maps API implementation
// Uncomment and complete when you have your API key
/*
async function searchGoogleMaps(query, location, type) {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!API_KEY) {
    throw new Error("Google Maps API key not configured");
  }
  
  const params = {
    key: API_KEY,
    query: query,
  };
  
  if (location) {
    params.location = location;
    params.radius = 5000; // 5km radius
  }
  
  if (type && type !== 'any') {
    params.type = type;
  }
  
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params
  });
  
  return response.data;
}
*/

// Add these methods to the server object before exporting
server.getAvailableTools = function() {
  // Return a list of all defined tools with their IDs and metadata
  return [
    { 
      id: "google-maps-search", 
      name: "Google Maps Search",
      description: "Search for locations and places using Google Maps"
    },
    { 
      id: "google-weather", 
      name: "Google Weather",
      description: "Get weather information for a location"
    },
    { 
      id: "sec-filings", 
      name: "SEC Filings",
      description: "Search for SEC filings for a company"
    },
    { 
      id: "companies-house", 
      name: "Companies House",
      description: "Search for UK company information from Companies House"
    },
    {
      id: "yahoo-finance-stock-metric",
      name: "Yahoo Finance Stock Metric",
      description: "Get current stock metrics like price, market cap, P/E ratio, etc."
    },
    {
      id: "yahoo-finance-historical-data",
      name: "Yahoo Finance Historical Data",
      description: "Get historical stock price data for a specific time period"
    }
  ];
};

server.callToolDirectly = async function(toolId, params) {
  console.log('Directly calling tool:', toolId, 'with params:', params);
  
  try {
    if (toolId === 'google-maps-search') {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(await mockGoogleMapsSearch(
            params.query, 
            params.location, 
            params.type
          ), null, 2)
        }]
      };
    } else if (toolId === 'google-weather') {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(await mockWeatherSearch(
            params.location, 
            params.days
          ), null, 2)
        }]
      };
    } else if (toolId === 'yahoo-finance-stock-metric') {
      // Call the Yahoo Finance integration service
      return await yahooFinance.getStockMetric(params);
    } else if (toolId === 'yahoo-finance-historical-data') {
      // Call the Yahoo Finance integration service
      return await yahooFinance.getHistoricalData(params);
    } else if (toolId === 'sec-filings') {
      try {
        if (params.download_id) {
          // Handle file downloads
          try {
            const parts = params.download_id.split('|');
            if (parts.length !== 3) {
              return {
                status: "ERROR",
                error: "Invalid file download format",
                data: []
              };
            }
            
            const [ticker, filingType, filingDate] = parts;
            const filingData = {
              ticker,
              filingType,
              filingDate
            };
            
            const downloadResult = await downloadSECFiling(filingData);
            return downloadResult;
          } catch (downloadError) {
            console.error('SEC filing download error:', downloadError);
            return {
              status: "ERROR",
              error: downloadError.message || "Failed to download SEC filing",
              data: []
            };
          }
        } else {
          // Search for filings
          try {
            // Validate inputs before making the request
            if (!params.company || params.company.trim() === '') {
              return {
                status: "ERROR",
                error: "Company name or ticker symbol is required",
                data: [],
                suggestion: "Please provide a company name like 'Apple' or ticker symbol like 'AAPL'"
              };
            }
            
            // Clean up company input
            const companyName = params.company.trim()
              .replace(/^can you (?:get|give|find|show|retrieve)(?: me)?\s+(?:the )?/, '')  // Remove prefixes like "can you give me the"
              .replace(/^(the|for|from) /, '')                   // Remove leading "the", "for", "from"
              .replace(/([ .,?!])?(please|thanks|thank you)$/, '') // Remove trailing "please", etc.
              .replace(/'s$/i, '')                              // Remove possessive 's at the end
              .trim();
            
            console.log(`Processing SEC filing search for company: "${companyName}"`);
            
            // Search for real filings
            try {
              const result = await secFilingsSearch(companyName, params.filingType, params.limit);
              return result;
            } catch (lookupError) {
              // Check if the error message contains a suggested company
              const didYouMeanMatch = lookupError.message.match(/Did you mean "(.*?)" \((.*?)\)\?/);
              if (didYouMeanMatch) {
                const suggestedName = didYouMeanMatch[1];
                const suggestedTicker = didYouMeanMatch[2];
                
                return {
                  status: "ERROR",
                  error: lookupError.message,
                  data: [],
                  errorDetails: {
                    userQueryInfo: {
                      providedCompany: companyName,
                      providedFilingType: params.filingType,
                      suggestedCompany: suggestedName,
                      suggestedTicker: suggestedTicker
                    },
                    suggestion: `Try searching for "${suggestedName}" (${suggestedTicker}) instead.`
                  }
                };
              }
              
              // If no suggestion, return the regular error
              throw lookupError;
            }
          } catch (searchError) {
            console.error('SEC filing search error:', searchError);
            
            // Provide a meaningful response without mock data
            return {
              status: "ERROR",
              error: searchError.message || "Failed to search SEC filings",
              data: [],
              errorDetails: {
                userQueryInfo: {
                  providedCompany: params.company,
                  providedFilingType: params.filingType
                },
                suggestion: "Please try searching with a different company name or ticker symbol. For example, use 'TSLA' or 'Tesla' for Tesla, Inc."
              }
            };
          }
        }
      } catch (error) {
        console.error('SEC filings tool error:', error);
        return {
          status: "ERROR",
          error: error.message || "An unexpected error occurred",
          data: [],
          errorDetails: {
            userQueryInfo: {
              providedCompany: params.company,
              providedFilingType: params.filingType
            },
            suggestion: "Please try with a different query format."
          }
        };
      }
    } else if (toolId === 'companies-house') {
      if (params.download_id) {
        // Handle file download if download_id is provided
        const parts = params.download_id.split('-');
        if (parts.length >= 3 && parts[0] === 'CH') {
          const company_number = parts[1];
          const filing_date = parts.slice(2).join('-');
          
          const filingData = {
            company_name: params.company || `UK Company ${company_number}`,
            company_number,
            filing_type: params.filingType || 'Company Filing',
            filing_date,
            filing_description: `${params.filingType || 'Company Filing'} for ${params.company || `UK Company ${company_number}`}`,
            filing_url: `https://example.com/companies-house/${company_number}/${params.download_id}.pdf`,
            filing_id: params.download_id
          };
          
          return await downloadCompaniesHouseFiling(filingData);
        } else {
          return {
            status: "ERROR",
            message: "Invalid filing ID format"
          };
        }
      } else {
        // Search for filings
        return await mockCompaniesHouseSearch(
          params.company, 
          params.filingType, 
          params.limit
        );
      }
    }
  } catch (error) {
    console.error(`Error calling tool ${toolId}:`, error);
    // Return a properly structured error response for any uncaught error
    return {
      status: "ERROR",
      error: error.message || "An unknown error occurred",
      errorDetails: {
        toolId: toolId
      }
    };
  }
};

async function downloadSECFiling(filingData) {
  // Real implementation for downloading SEC filings
  try {
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
    
    // Set up cache directory
    const cacheDir = path.join(__dirname, '..', '..', 'storage', 'sec_cache', 'downloads');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Rate limiting setup - using a simple delay instead of the limiter package to prevent errors
    const lastDownloadTime = downloadSECFiling.lastDownloadTime || 0;
    const now = Date.now();
    const timeSinceLastDownload = now - lastDownloadTime;
    
    // Wait if necessary to comply with SEC rate limits (10 requests per second)
    if (timeSinceLastDownload < 100) { // 100ms = 10 requests per second
      await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastDownload));
    }
    
    // Update last download time
    downloadSECFiling.lastDownloadTime = Date.now();
    
    // Email and name for User-Agent - replace with actual contact information
    const contactEmail = process.env.SEC_CONTACT_EMAIL || 'AdminContact@example.com';
    const appName = process.env.SEC_APP_NAME || 'LLM Chat App';
    const userAgentString = `${appName} ${contactEmail}`;
    
    // Validate input
    if (!filingData || !filingData.filing_url) {
      throw new Error('Invalid filing data or missing URL');
    }
    
    // Generate a cache filename based on filing ID or URL
    const cacheFileName = filingData.filing_id || 
      filingData.filing_url.split('/').pop().replace(/[^\w.-]/g, '_');
    const cacheFilePath = path.join(cacheDir, cacheFileName);
    
    // Check if we have this file cached
    if (fs.existsSync(cacheFilePath)) {
      console.log(`Using cached SEC filing: ${cacheFilePath}`);
      const fileContent = fs.readFileSync(cacheFilePath);
      return {
        content: fileContent,
        fileName: `${filingData.ticker_symbol}_${filingData.filing_type}_${filingData.filing_date}.pdf`,
        contentType: 'application/pdf'
      };
    }
    
    // Download the filing
    const headers = {
      'User-Agent': userAgentString,
      'Accept': 'application/pdf,text/html,application/xhtml+xml'
    };
    
    console.log(`Downloading SEC filing from: ${filingData.filing_url}`);
    
    const response = await axios.get(filingData.filing_url, { 
      headers,
      responseType: 'arraybuffer'
    });
    
    // Determine content type
    const contentType = response.headers['content-type'] || 'application/pdf';
    let fileExtension = 'pdf';
    
    if (contentType.includes('html')) {
      fileExtension = 'html';
    } else if (contentType.includes('xml')) {
      fileExtension = 'xml';
    }
    
    // Save to cache
    fs.writeFileSync(cacheFilePath, response.data);
    
    // Return the file content
    return {
      content: response.data,
      fileName: `${filingData.ticker_symbol}_${filingData.filing_type}_${filingData.filing_date}.${fileExtension}`,
      contentType
    };
    
  } catch (error) {
    console.error('Error downloading SEC filing:', error);
    
    // Instead of generating a mock PDF, throw a helpful error
    throw new Error(`Unable to download the SEC filing: ${error.message}. Please check your network connection or try again later.`);
  }
}

// Convert MCP tools to OpenAI/Claude function calling format
server.getFunctionDefinitions = function() {
  const tools = [
    { 
      id: "google-maps-search", 
      name: "google_maps_search",
      description: "Search for locations and places using Google Maps",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query for finding places"
          },
          location: {
            type: "string",
            description: "Optional location bias in 'latitude,longitude' format"
          },
          type: {
            type: "string",
            enum: ["restaurant", "cafe", "park", "museum", "hotel", "any"],
            description: "Type of place to search for"
          }
        },
        required: ["query"]
      }
    },
    { 
      id: "google-weather", 
      name: "google_weather",
      description: "Get weather information for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location to get weather for (city, address, or lat/lng)"
          },
          days: {
            type: "integer",
            description: "Number of days for forecast (1-7)"
          }
        },
        required: ["location"]
      }
    },
    { 
      id: "sec-filings", 
      name: "sec_filings",
      description: "Search for SEC filings for a company",
      parameters: {
        type: "object",
        properties: {
          company: {
            type: "string",
            description: "Company name or ticker symbol"
          },
          filingType: {
            type: "string",
            enum: ["10-K", "10-Q", "8-K", "ALL"],
            description: "Type of SEC filing to search for"
          },
          limit: {
            type: "integer",
            description: "Maximum number of results to return"
          }
        },
        required: ["company"]
      }
    },
    { 
      id: "companies-house", 
      name: "companies_house",
      description: "Search for UK company information from Companies House",
      parameters: {
        type: "object",
        properties: {
          company: {
            type: "string",
            description: "Company name or registration number"
          },
          filingType: {
            type: "string",
            enum: ["ACCOUNTS", "ANNUAL_RETURN", "INCORPORATION", "OFFICERS", "CHARGES", "ALL"],
            description: "Type of filing to search for"
          },
          limit: {
            type: "integer",
            description: "Maximum number of results to return"
          }
        },
        required: ["company"]
      }
    },
    {
      id: "yahoo-finance-stock-metric",
      name: "yahoo_finance_stock_metric",
      description: "Get current stock metrics like price, market cap, P/E ratio, etc.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Stock symbol (e.g., 'AAPL', 'MSFT', 'TSLA')"
          },
          metric: {
            type: "string",
            description: "Stock metric to retrieve (e.g., 'regularMarketPrice', 'marketCap', 'trailingPE')"
          }
        },
        required: ["symbol", "metric"]
      }
    },
    {
      id: "yahoo-finance-historical-data",
      name: "yahoo_finance_historical_data",
      description: "Get historical stock price data for a specific time period",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Stock symbol (e.g., 'AAPL', 'MSFT', 'TSLA')"
          },
          period: {
            type: "string",
            enum: ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"],
            description: "Time period for historical data"
          }
        },
        required: ["symbol"]
      }
    }
  ];
  
  return tools;
};

// Execute function called by LLM
server.executeFunction = async function(functionName, args) {
  console.log(`Executing LLM-called function: ${functionName} with args:`, args);
  
  try {
    // Map the function name back to tool ID
    const toolMapping = {
      'google_maps_search': 'google-maps-search',
      'google_weather': 'google-weather',
      'sec_filings': 'sec-filings',
      'companies_house': 'companies-house',
      'yahoo_finance_stock_metric': 'yahoo-finance-stock-metric',
      'yahoo_finance_historical_data': 'yahoo-finance-historical-data'
    };
    
    const toolId = toolMapping[functionName];
    if (!toolId) {
      throw new Error(`Unknown function: ${functionName}`);
    }
    
    // Call the appropriate tool with the arguments
    const result = await this.callToolDirectly(toolId, args);
    return result;
  } catch (error) {
    console.error(`Error executing function ${functionName}:`, error);
    return {
      status: "ERROR",
      error: error.message || "An unknown error occurred",
      errorDetails: {
        functionName: functionName
      }
    };
  }
};

// Export the MCP server instance
module.exports = {
  mcpServer: server,
  secFilingsSearch,
  downloadSECFiling,
  getSuggestedCompany
};

// Helper function to get company suggestions when the exact match isn't found
async function getSuggestedCompany(userInput, companies) {
  // Convert common company name variations to their proper form
  const commonCompanies = {
    'google': 'Alphabet',
    'alphabet': 'Alphabet',
    'goog': 'Alphabet',
    'googl': 'Alphabet',
    'amazon': 'Amazon',
    'amzn': 'Amazon',
    'apple': 'Apple',
    'aapl': 'Apple',
    'microsoft': 'Microsoft',
    'msft': 'Microsoft',
    'meta': 'Meta Platforms',
    'facebook': 'Meta Platforms',
    'fb': 'Meta Platforms',
    'meta platforms': 'Meta Platforms',
    'tesla': 'Tesla',
    'tsla': 'Tesla',
    'nvidia': 'NVIDIA',
    'nvda': 'NVIDIA',
    'netflix': 'Netflix',
    'nflx': 'Netflix',
    'walmart': 'Walmart',
    'wmt': 'Walmart'
  };
  
  const normalizedInput = userInput.toLowerCase();
  
  // Check if it's a common company with a known mapping
  if (commonCompanies[normalizedInput]) {
    const targetName = commonCompanies[normalizedInput];
    const matchedCompany = companies.find(c => 
      c.title.includes(targetName)
    );
    if (matchedCompany) {
      return matchedCompany;
    }
  }
  
  // Look for partial matches
  const possibleMatches = companies.filter(c => {
    const title = c.title.toLowerCase();
    const ticker = c.ticker.toLowerCase();
    
    return title.includes(normalizedInput) || 
           normalizedInput.includes(title) || 
           ticker.includes(normalizedInput) ||
           normalizedInput.includes(ticker);
  });
  
  // Return the first potential match if any found
  if (possibleMatches.length > 0) {
    return possibleMatches[0];
  }
  
  return null;
} 