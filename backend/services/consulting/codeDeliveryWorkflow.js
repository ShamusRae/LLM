// Purpose: Orchestrate Planning -> Sandbox Execution -> Review workflow.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

class CodeDeliveryWorkflow {
  constructor({ planningAgent, executionAgent, reviewAgent }) {
    this.planningAgent = planningAgent;
    this.executionAgent = executionAgent;
    this.reviewAgent = reviewAgent;
    this.lastRun = null;
  }

  async run(request, onUpdate) {
    const startedAt = new Date().toISOString();
    const updates = [];
    const emit = async (stage, details = {}) => {
      const payload = { workflowMode: 'code_delivery', stage, ...details, timestamp: new Date().toISOString() };
      updates.push(payload);
      if (onUpdate) await onUpdate(payload);
    };

    await emit('planning');
    const plan = await this.planningAgent.createPlan(request);

    await emit('sandbox_execution');
    const execution = await this.executionAgent.executePlan(plan, { testCommand: request?.testCommand });

    await emit('review');
    const review = await this.reviewAgent.review({ plan, execution });

    await emit('test_gate', { passed: review.approved });
    if (!review.approved) {
      const failure = {
        success: false,
        workflowMode: 'code_delivery',
        startedAt,
        plan,
        execution,
        review,
        updates
      };
      this.lastRun = failure;
      return failure;
    }

    const result = {
      success: true,
      workflowMode: 'code_delivery',
      startedAt,
      plan,
      execution,
      review,
      updates
    };
    this.lastRun = result;
    return result;
  }

  getDiagnostics() {
    return {
      supportedModes: ['analysis_consulting', 'code_delivery'],
      lastRun: this.lastRun
        ? {
            success: this.lastRun.success,
            workflowMode: this.lastRun.workflowMode,
            startedAt: this.lastRun.startedAt,
            finalStage: this.lastRun.updates?.[this.lastRun.updates.length - 1]?.stage || 'unknown'
          }
        : null
    };
  }
}

module.exports = CodeDeliveryWorkflow;

