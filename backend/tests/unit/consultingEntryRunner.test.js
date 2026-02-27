// Purpose: Unit tests for consultingEntryRunner AI/tool fast path.
// Author: LLM Chat, Last Modified: 2025-02-26

const { describe, test, expect, beforeEach } = require('@jest/globals');

jest.mock('../../services/ai/aiService', () => ({
  callAI: jest.fn()
}));

jest.mock('../../services/mcpBridge', () => ({
  getFunctionDefinitions: jest.fn()
}));

const aiService = require('../../services/ai/aiService');
const mcpBridge = require('../../services/mcpBridge');
const runner = require('../../services/consulting/consultingEntryRunner');

describe('consultingEntryRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('buildPrompt includes query, context, and companies', () => {
    const prompt = runner.buildPrompt('Should I buy AMD?', 'Long horizon', ['AMD', 'NVIDIA']);
    expect(prompt).toContain('Should I buy AMD?');
    expect(prompt).toContain('Long horizon');
    expect(prompt).toContain('AMD, NVIDIA');
  });

  test('getFastAnalysisTools filters to allowed tool names', () => {
    mcpBridge.getFunctionDefinitions.mockReturnValue([
      { name: 'yahoo_finance_stock_metric' },
      { name: 'sec_filings' },
      { name: 'google_weather' }
    ]);
    const defs = runner.getFastAnalysisTools();
    expect(defs).toEqual([
      { name: 'yahoo_finance_stock_metric' },
      { name: 'sec_filings' }
    ]);
  });

  test('runFastConsultingEntry calls aiService with filtered function definitions', async () => {
    mcpBridge.getFunctionDefinitions.mockReturnValue([{ name: 'yahoo_finance_stock_metric' }]);
    aiService.callAI.mockResolvedValue({ content: 'analysis json' });

    const result = await runner.runFastConsultingEntry({
      query: 'Analyze AMD vs NVDA',
      context: 'I already hold AMD',
      companies: ['AMD', 'NVIDIA'],
      model: 'o4-mini'
    });

    expect(aiService.callAI).toHaveBeenCalledWith(
      expect.stringContaining('Analyze AMD vs NVDA'),
      'o4-mini',
      { functionDefinitions: [{ name: 'yahoo_finance_stock_metric' }] }
    );
    expect(result.raw).toBe('analysis json');
    expect(result.model).toBe('o4-mini');
    expect(result.timestamp).toBeDefined();
  });
});

