// Purpose: Validate sandbox execution constraints and test gate behavior.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const CodeExecutionAgent = require('../../services/consulting/codeExecutionAgent');

describe('CodeExecutionAgent', () => {
  let agent;

  beforeEach(() => {
    agent = new CodeExecutionAgent();
  });

  test('rejects unsafe file paths', async () => {
    const plan = {
      files: [{ path: '../outside.txt', content: 'nope' }],
      testCommand: 'node -e process.exit(0)'
    };
    await expect(agent.executePlan(plan)).rejects.toThrow('Disallowed file path');
  });

  test('executes allowed test command in sandbox', async () => {
    const plan = {
      files: [{ path: 'index.js', content: 'console.log("ok")' }],
      testCommand: 'node -e process.exit(0)'
    };
    const result = await agent.executePlan(plan);
    expect(result.filesWritten).toEqual(['index.js']);
    expect(result.toolAllowlist).toContain('run_tests');
    expect(result.testResult.code).toBe(0);
  });
});

