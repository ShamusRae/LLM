/**
 * Test script for Yahoo Finance pattern detection
 */

// Define patterns from avatarService.js
const yahooFinancePatterns = [
  // Stock price patterns
  /(?:what(?:'s| is) the )?(?:stock |share |)price(?: of| for) ([A-Za-z0-9\.\-]+)(?:\?|$|\.|)/i,
  /(?:how much (?:is|does) |what(?:'s| is) the value of )([A-Za-z0-9\.\-]+)(?: stock| share| trading at)(?:\?|$|\.|)/i,
  /(?:get|show|tell me|find)(?: me)? (?:the )?([A-Za-z0-9\.\-]+) (?:stock|share) price(?:\?|$|\.|)/i,
  
  // Historical data patterns - IMPORTANT: These must come before the metrics patterns
  /(?:show|get|find|give)(?: me)? (?:the )?historical (?:data|performance|prices|chart) (?:for|of) ([A-Za-z0-9\.\-]+)(?: for)?(?: the past)?(?: last)? ?([0-9]+[dmy])?(?:\?|$|\.|)/i,
  /(?:how has|what(?:'s| is) the performance of) ([A-Za-z0-9\.\-]+)(?: been| performed| done)(?: in the past| over the last| in the last)? ?([0-9]+[dmy])?(?:\?|$|\.|)/i,
  
  // Financial metrics patterns
  /(?:what(?:'s| is) the |get |show |find )(?:the )?([a-zA-Z \/]+?)(?= for| of) (?:for|of) ([A-Za-z0-9\.\-]+)(?:\?|$|\.|)/i,
  /(?:what(?:'s| is)|get|show|find) ([A-Za-z0-9\.\-]+)(?:'s| company\'s| corporation\'s| stock\'s) ([a-zA-Z \/]+?)(?:\?|$|\.|)/i
];

/**
 * Test function that mimics the detectToolRequest function
 */
function detectYahooFinanceRequest(message) {
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
  const metricPatterns = [
    /(?:what(?:'s| is) the |get |show |find )(?:the )?([a-zA-Z \/]+?)(?= for| of) (?:for|of) ([A-Za-z0-9\.\-]+)(?:\?|$|\.|)/i,
    /(?:what(?:'s| is)|get|show|find) ([A-Za-z0-9\.\-]+)(?:'s| company\'s| corporation\'s| stock\'s) ([a-zA-Z \/]+?)(?:\?|$|\.|)/i
  ];
  
  for (const pattern of metricPatterns) {
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
  
  return null;
}

// Test cases
const testQueries = [
  "What's the share price for tesla",
  "What is the current price of AAPL?",
  "How much is MSFT stock trading at?",
  "Get me AMZN stock price",
  "What's the market cap for GOOGL?",
  "Show me historical data for NFLX",
  "How has FB performed over the last 3m?",
  "What's TSLA's P/E ratio?",
  "What is NVDA's dividend yield?",
  "What is the P/E ratio for AMD?",
  "Show me the dividend yield for JPM"
];

console.log("Testing Yahoo Finance pattern detection:");
console.log("--------------------------------------");

testQueries.forEach(query => {
  console.log(`\nQuery: "${query}"`);
  const result = detectYahooFinanceRequest(query);
  if (result) {
    console.log("✅ Match found:");
    console.log(result);
  } else {
    console.log("❌ No match found");
  }
}); 