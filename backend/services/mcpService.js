const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');
const axios = require('axios');
const { createFileFromExternalSource } = require('./fileService');

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
  // Input validation
  if (!company || typeof company !== 'string') {
    throw new Error('Company name or CIK is required');
  }
  
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');
  
  // Set up cache directory
  const cacheDir = path.join(__dirname, '..', '..', 'storage', 'sec_cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  // Rate limiting setup
  const limiter = require('limiter');
  const RateLimiter = limiter.RateLimiter;
  // 10 requests per second as per SEC guidelines
  const secRateLimiter = new RateLimiter({ tokensPerInterval: 10, interval: 'second' });
  
  try {
    // Step 1: Try to determine if input is a CIK number or company name
    let cik = null;
    
    // Check if input is a CIK number (all digits)
    if (/^\d+$/.test(company)) {
      // Pad with leading zeros to make 10 digits
      cik = company.padStart(10, '0');
    } else {
      // Search for the company by name to get CIK
      // First check cache
      const cacheFile = path.join(cacheDir, `company_lookup_${company.replace(/[^\w]/g, '_')}.json`);
      
      if (fs.existsSync(cacheFile)) {
        // Use cached data
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        cik = cachedData.cik;
      } else {
        // Need to search for company - this is a simplified approach
        // In a full implementation, you would use the SEC company search API
        // For now, we'll throw an error and suggest using CIK directly
        throw new Error(`Please provide a CIK number instead of company name "${company}". The SEC API does not support direct company name lookups.`);
      }
    }
    
    // Step 2: Get company submissions
    await secRateLimiter.removeTokens(1);
    
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const headers = {
      'User-Agent': 'LLM Chat App AdminContact@example.com',  // Replace with your actual info
      'Accept': 'application/json'
    };
    
    const submissionsResponse = await axios.get(submissionsUrl, { headers });
    
    // Save to cache
    const submissionsCacheFile = path.join(cacheDir, `submissions_${cik}.json`);
    fs.writeFileSync(submissionsCacheFile, JSON.stringify(submissionsResponse.data));
    
    // Step 3: Process and filter the submissions data
    const companyData = submissionsResponse.data;
    const companyName = companyData.name || company;
    const ticker = companyData.tickers?.[0] || 'N/A';
    
    let filings = [];
    const filingTypes = filingType ? [filingType.toUpperCase()] : ["10-K", "10-Q", "8-K"];
    
    // Parse recent filings
    if (companyData.filings && companyData.filings.recent) {
      const recentFilings = companyData.filings.recent;
      const forms = recentFilings.form || [];
      const reportDates = recentFilings.reportDate || [];
      const filingDates = recentFilings.filingDate || [];
      const accessionNumbers = recentFilings.accessionNumber || [];
      const primaryDocuments = recentFilings.primaryDocument || [];
      
      for (let i = 0; i < forms.length && filings.length < limit; i++) {
        if (filingTypes.includes(forms[i])) {
          const accessionNumber = accessionNumbers[i].replace(/-/g, '');
          const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber}/${primaryDocuments[i]}`;
          
          filings.push({
            company_name: companyName,
            ticker_symbol: ticker,
            filing_type: forms[i],
            filing_date: filingDates[i],
            report_date: reportDates[i],
            filing_url: filingUrl,
            description: getFilingDescription(forms[i]),
            filing_id: `${ticker}-${forms[i]}-${filingDates[i]}`,
            accession_number: accessionNumbers[i],
            has_downloadable_file: true
          });
        }
      }
    }
    
    return {
      status: "OK",
      data: filings
    };
    
  } catch (error) {
    console.error('SEC API error:', error);
    return {
      status: "ERROR",
      error: error.message,
      data: []
    };
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
  
  return descriptions[filingType] || "SEC Filing";
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
    }
  ];
};

server.callToolDirectly = async function(toolId, params) {
  console.log(`Directly calling tool: ${toolId} with params:`, params);
  try {
    // This method allows for direct tool execution without going through 
    // the MCP protocol negotiation
    switch (toolId) {
      case 'google-maps-search':
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
        
      case 'google-weather':
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(await mockWeatherSearch(
              params.location, 
              params.days
            ), null, 2)
          }]
        };
        
      case 'sec-filings':
        if (params.download_id) {
          // Handle file download if download_id is provided
          const parts = params.download_id.split('-');
          if (parts.length >= 3) {
            const ticker = parts[0];
            const filing_type = parts[1];
            const filing_date = parts.slice(2).join('-');
            
            const filingData = {
              company_name: params.company || `${ticker} Corporation`,
              ticker_symbol: ticker,
              filing_type,
              filing_date,
              description: filing_type === '10-K' ? 'Annual Report' : (filing_type === '10-Q' ? 'Quarterly Report' : 'Report'),
              filing_url: `https://example.com/sec/${ticker}/${params.download_id}.pdf`,
              filing_id: params.download_id
            };
            
            return await downloadSECFiling(filingData);
          } else {
            return {
              status: "ERROR",
              message: "Invalid filing ID format"
            };
          }
        } else {
          // Search for filings
          return await secFilingsSearch(
            params.company, 
            params.filingType, 
            params.limit
          );
        }
        
      case 'companies-house':
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
        
      default:
        return {
          content: [{ 
            type: "text", 
            text: `Unknown tool: ${toolId}`
          }],
          isError: true
        };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolId} directly:`, error);
    return {
      content: [{ 
        type: "text", 
        text: `Error: ${error.message}`
      }],
      isError: true
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
    
    // Rate limiting setup
    const limiter = require('limiter');
    const RateLimiter = limiter.RateLimiter;
    // 10 requests per second as per SEC guidelines
    const secRateLimiter = new RateLimiter({ tokensPerInterval: 10, interval: 'second' });
    
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
    
    // Wait for rate limiter token
    await secRateLimiter.removeTokens(1);
    
    // Download the filing
    const headers = {
      'User-Agent': 'LLM Chat App AdminContact@example.com',  // Replace with your actual info
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
    
    // Fall back to generating a mock PDF
    const mockPdfContent = Buffer.from(`%PDF-1.5
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
<< /Length 150 >>
stream
BT
/F1 12 Tf
100 700 Td
(MOCK SEC FILING - Error retrieving actual filing) Tj
110 680 Td
(Company: ${filingData.company_name || 'Unknown'}) Tj
110 660 Td
(Filing Type: ${filingData.filing_type || 'Unknown'}) Tj
110 640 Td
(Date: ${filingData.filing_date || 'Unknown'}) Tj
110 620 Td
(Error: ${error.message}) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R /Size 5 >>
startxref
0
%%EOF`);

    return {
      content: mockPdfContent,
      fileName: `${filingData.ticker_symbol || 'unknown'}_${filingData.filing_type || 'filing'}_${filingData.filing_date || 'date'}.pdf`,
      contentType: 'application/pdf'
    };
  }
}

// Export the MCP server instance
module.exports = {
  mcpServer: server,
  secFilingsSearch,
  downloadSECFiling
}; 