const yahooFinance = require('yahoo-finance2').default;
const yahooIntegration = require('../../services/yahoo-finance-mcp-integration');

jest.mock('yahoo-finance2', () => ({
  default: {
    quote: jest.fn(),
    quoteSummary: jest.fn()
  }
}));

describe('yahoo-finance-mcp-integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    yahooFinance.quote.mockResolvedValue({
      symbol: 'AAPL',
      regularMarketPrice: 200.5,
      regularMarketTime: 1700000000,
      regularMarketChange: 1.2,
      regularMarketChangePercent: 0.6
    });
  });

  test('maps currentPrice to live regularMarketPrice', async () => {
    const result = await yahooIntegration.getStockMetric({
      symbol: 'AAPL',
      metric: 'currentPrice'
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.metric).toBe('currentPrice');
    expect(payload.normalizedMetric).toBe('regularMarketPrice');
    expect(payload.value).toBe(200.5);
    expect(payload.source).toBe('yahoo-finance-live-quote');
    expect(payload.asOf).toBeTruthy();
  });

  test('defaults to regularMarketPrice when no metric supplied', async () => {
    const result = await yahooIntegration.getStockMetric({
      symbol: 'AAPL'
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.normalizedMetric).toBe('regularMarketPrice');
    expect(payload.value).toBe(200.5);
  });
});
