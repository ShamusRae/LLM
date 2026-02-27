// Purpose: Review sandbox execution output and produce release decision.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

class CodeReviewAgent {
  async review({ plan, execution }) {
    const passed = execution?.testResult?.code === 0;
    const summary = passed
      ? 'Tests passed in sandbox; delivery is ready for handoff.'
      : 'Tests failed in sandbox; update implementation before delivery.';

    return {
      approved: passed,
      summary,
      objective: plan?.objective || '',
      files: execution?.filesWritten || [],
      testExitCode: execution?.testResult?.code,
      stdoutPreview: String(execution?.testResult?.stdout || '').slice(0, 1000),
      stderrPreview: String(execution?.testResult?.stderr || '').slice(0, 1000)
    };
  }
}

module.exports = CodeReviewAgent;

