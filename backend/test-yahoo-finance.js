// Test script for Yahoo Finance integration

const yahooFinance = require('./services/yahoo-finance-mcp-integration');

async function runTests() {
  console.log('Testing Yahoo Finance Integration');
  
  try {
    // Test if the Yahoo Finance API is available
    console.log('Testing API availability...');
    const isAvailable = await yahooFinance.isYahooFinanceMcpAvailable();
    console.log('Yahoo Finance API available:', isAvailable);
    
    if (isAvailable) {
      // Test getting stock price
      console.log('\nTesting stock price query...');
      const priceResult = await yahooFinance.getStockMetric({
        symbol: 'AAPL',
        metric: 'regularMarketPrice'
      });
      console.log('Apple stock price result:');
      console.log(JSON.parse(priceResult.content[0].text));
      
      // Test getting market cap
      console.log('\nTesting market cap query...');
      const marketCapResult = await yahooFinance.getStockMetric({
        symbol: 'MSFT',
        metric: 'marketCap'
      });
      console.log('Microsoft market cap result:');
      console.log(JSON.parse(marketCapResult.content[0].text));
      
      // Test historical data
      console.log('\nTesting historical data query...');
      const historicalResult = await yahooFinance.getHistoricalData({
        symbol: 'TSLA',
        period: '1mo'
      });
      const historicalData = JSON.parse(historicalResult.content[0].text);
      console.log('Tesla historical data:');
      console.log(`Retrieved ${historicalData.historicalData.length} data points`);
      console.log('First data point:', historicalData.historicalData[0]);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the tests
runTests().then(() => {
  console.log('\nTests completed');
}).catch(err => {
  console.error('Error running tests:', err);
}); 