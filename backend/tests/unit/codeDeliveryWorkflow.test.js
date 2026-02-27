// Purpose: Verify code_delivery workflow stage transitions and outcomes.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const CodeDeliveryWorkflow = require('../../services/consulting/codeDeliveryWorkflow');

describe('CodeDeliveryWorkflow', () => {
  test('emits planning -> execution -> review -> test_gate', async () => {
    const planningAgent = { createPlan: jest.fn().mockResolvedValue({ objective: 'x', files: [], testCommand: 'node -e process.exit(0)' }) };
    const executionAgent = { executePlan: jest.fn().mockResolvedValue({ filesWritten: [], testResult: { code: 0 } }) };
    const reviewAgent = { review: jest.fn().mockResolvedValue({ approved: true, summary: 'ok' }) };
    const wf = new CodeDeliveryWorkflow({ planningAgent, executionAgent, reviewAgent });
    const stages = [];

    const result = await wf.run({ query: 'build' }, (u) => stages.push(u.stage));
    expect(result.success).toBe(true);
    expect(stages).toEqual(['planning', 'sandbox_execution', 'review', 'test_gate']);
  });

  test('fails test gate when review not approved', async () => {
    const wf = new CodeDeliveryWorkflow({
      planningAgent: { createPlan: jest.fn().mockResolvedValue({ files: [] }) },
      executionAgent: { executePlan: jest.fn().mockResolvedValue({ testResult: { code: 1 } }) },
      reviewAgent: { review: jest.fn().mockResolvedValue({ approved: false }) }
    });
    const result = await wf.run({ query: 'build' });
    expect(result.success).toBe(false);
    expect(result.updates[result.updates.length - 1].stage).toBe('test_gate');
  });
});

