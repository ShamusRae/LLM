/**
 * Yahoo Finance Integration Service
 * 
 * This service directly integrates with Yahoo Finance APIs using yahoo-finance2 library
 * No external Python server required
 */

// You'll need to install this: npm install yahoo-finance2
const yahooFinance = require('yahoo-finance2').default;

/**
 * Get stock metric directly from Yahoo Finance
 * @param {Object} options - Options object
 * @param {string} options.symbol - Stock symbol (e.g., 'AAPL')
 * @param {string} options.metric - The specific metric to retrieve (e.g., 'currentPrice')
 * @returns {Promise<Object>} - The requested stock metric data
 */
async function getStockMetric(options) {
  try {
    console.log(`Fetching Yahoo Finance data for ${options.symbol}, metric: ${options.metric}`);
    
    // Fetch the quote data from Yahoo Finance API with error handling
    let quote;
    try {
      quote = await yahooFinance.quote(options.symbol);
      
      // Validate quote data exists
      if (!quote || typeof quote !== 'object') {
        throw new Error(`Invalid quote data received for ${options.symbol}`);
      }
    } catch (error) {
      console.error(`Failed to fetch quote for ${options.symbol}:`, error.message);
      throw new Error(`Unable to fetch stock data for ${options.symbol}: ${error.message}`);
    }
    
    // Get additional info for metrics not in quote
    let info = {};
    if (!quote[options.metric]) {
      try {
        const additionalInfo = await yahooFinance.quoteSummary(options.symbol, { modules: ['financialData', 'summaryDetail', 'price'] });
        info = {
          ...additionalInfo.financialData,
          ...additionalInfo.summaryDetail,
          ...additionalInfo.price
        };
      } catch (e) {
        console.log('Could not fetch additional data:', e.message);
      }
    }
    
    // Combine quote and additional info
    const allData = { ...quote, ...info };
    
    // Check if the requested metric exists
    if (options.metric in allData) {
      const result = {
        symbol: options.symbol,
        [options.metric]: allData[options.metric],
        longName: allData.longName || allData.shortName || options.symbol
      };
      
      // Add some common fields when requesting price
      if (options.metric === 'currentPrice' || options.metric === 'regularMarketPrice') {
        // Safely add additional price fields if they exist
        if (allData.regularMarketChangePercent !== undefined) {
          result.regularMarketChangePercent = allData.regularMarketChangePercent;
        }
        if (allData.regularMarketChange !== undefined) {
          result.regularMarketChange = allData.regularMarketChange;
        }
      }
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(result, null, 2)
        }]
      };
    } else {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ error: `Metric '${options.metric}' not found for symbol ${options.symbol}` }, null, 2)
        }],
        isError: true
      };
    }
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({ error: `Failed to fetch stock data: ${error.message}` }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Get historical data directly from Yahoo Finance
 * @param {Object} options - Options object
 * @param {string} options.symbol - Stock symbol (e.g., 'AAPL')
 * @param {string} options.period - Time period (e.g., '1mo', '1y')
 * @returns {Promise<Object>} - Historical stock data
 */
async function getHistoricalData(options) {
  try {
    console.log(`Fetching Yahoo Finance historical data for ${options.symbol}, period: ${options.period}`);
    
    const period = options.period || '1mo';
    
    // Query the Yahoo Finance API directly
    const result = await yahooFinance.historical(options.symbol, {
      period1: getStartDate(period),
      period2: new Date(),
      interval: getPeriodInterval(period)
    });
    
    // Format the data
    const historicalData = result.map(item => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.adjClose || item.close,
      volume: item.volume
    }));
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          symbol: options.symbol,
          period: period,
          historicalData
        }, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error fetching Yahoo Finance historical data:', error);
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({ error: `Failed to fetch historical data: ${error.message}` }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Helper function to determine start date based on period
 */
function getStartDate(period) {
  const now = new Date();
  switch(period) {
    case '1d': return new Date(now.setDate(now.getDate() - 1));
    case '5d': return new Date(now.setDate(now.getDate() - 5));
    case '1mo': return new Date(now.setMonth(now.getMonth() - 1));
    case '3mo': return new Date(now.setMonth(now.getMonth() - 3));
    case '6mo': return new Date(now.setMonth(now.getMonth() - 6));
    case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
    case '2y': return new Date(now.setFullYear(now.getFullYear() - 2));
    case '5y': return new Date(now.setFullYear(now.getFullYear() - 5));
    case '10y': return new Date(now.setFullYear(now.getFullYear() - 10));
    case 'ytd': 
      return new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
    case 'max': 
      return new Date(1970, 0, 1); // Unix epoch
    default: 
      return new Date(now.setMonth(now.getMonth() - 1)); // Default to 1 month
  }
}

/**
 * Helper function to determine interval based on period
 */
function getPeriodInterval(period) {
  if (['1d', '5d'].includes(period)) return '1h';  // Hourly for short periods
  if (['1mo', '3mo'].includes(period)) return '1d'; // Daily for medium periods
  if (['6mo', '1y'].includes(period)) return '1d';  // Daily for medium-long periods
  return '1wk'; // Weekly for long periods
}

/**
 * Check if Yahoo Finance is available (always returns true since we're using direct integration)
 * @returns {Promise<boolean>} - Always true with direct integration
 */
async function isYahooFinanceMcpAvailable() {
  try {
    // Test call to verify the Yahoo Finance API is responding
    await yahooFinance.quote('AAPL');
    return true;
  } catch (error) {
    console.error('Yahoo Finance API is not available:', error.message);
    return false;
  }
}

module.exports = {
  getStockMetric,
  getHistoricalData,
  isYahooFinanceMcpAvailable
}; 