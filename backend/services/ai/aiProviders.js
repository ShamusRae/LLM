// Purpose: Shared AI provider API (testAIConnectivity, callAI). Mocked in tests.
// Author: LLM Chat, Last Modified: 2025-02-26

'use strict';

async function testAIConnectivity() {
  return { status: 'UNKNOWN', providers: [] };
}

async function callAI() {
  return { content: '', provider: 'unknown' };
}

module.exports = {
  testAIConnectivity,
  callAI,
};
