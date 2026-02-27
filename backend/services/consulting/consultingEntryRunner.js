// Purpose: Shared consulting entry runner for fast analysis using unified AI/tool path.
// Author: LLM Chat, Last Modified: 2025-02-26
'use strict';

const aiService = require('../ai/aiService');
const mcpBridge = require('../mcpBridge');

function buildPrompt(query, context, companies) {
  const targets = (companies || []).join(', ') || 'Target Company';
  return [
    'You are an investment consulting assistant.',
    'Return concise JSON with keys: executiveSummary, companies, actionItems, riskFactors.',
    `Query: ${query || ''}`,
    `Context: ${context || ''}`,
    `Target companies: ${targets}`,
    'Use available tools for market context when helpful. Keep output factual and practical.'
  ].join('\n');
}

function getFastAnalysisTools() {
  const defs = mcpBridge.getFunctionDefinitions();
  const allowed = new Set(['yahoo_finance_stock_metric', 'yahoo_finance_historical_data', 'sec_filings']);
  return defs.filter((d) => allowed.has(d.name));
}

async function runFastConsultingEntry({ query, context, companies, model }) {
  const prompt = buildPrompt(query, context, companies);
  const functionDefinitions = getFastAnalysisTools();
  const selectedModel = model || process.env.CONSULTING_FAST_MODEL || 'o4-mini';

  const result = await aiService.callAI(prompt, selectedModel, { functionDefinitions });
  const raw = typeof result?.content === 'string' ? result.content : JSON.stringify(result?.content || '');

  return {
    model: selectedModel,
    raw,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  buildPrompt,
  getFastAnalysisTools,
  runFastConsultingEntry
};

