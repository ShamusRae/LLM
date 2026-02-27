// Purpose: Execute generated code in an ephemeral, restricted workspace.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const TOOL_ALLOWLIST = ['read_file', 'write_file', 'edit_file', 'run_tests'];
const BLOCKED_PATTERNS = [/(\.\.\/)/, /(^\/)/, /^~\//];

function validateRelativePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(filePath));
}

function parseCommand(commandString) {
  const parts = String(commandString || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return { cmd: parts[0], args: parts.slice(1) };
}

function isAllowedCommand(command) {
  const allowed = ['npm', 'pnpm', 'yarn', 'node', 'pytest', 'python', 'python3'];
  return allowed.includes(command);
}

function runCommand({ cmd, args, cwd, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, NO_NETWORK: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: killed ? 124 : code, stdout, stderr, killed });
    });
  });
}

class CodeExecutionAgent {
  async executePlan(plan, options = {}) {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-chat-code-'));
    const files = Array.isArray(plan?.files) ? plan.files : [];

    for (const file of files) {
      if (!validateRelativePath(file.path)) {
        throw new Error(`Disallowed file path in sandbox plan: ${file.path}`);
      }
      const fullPath = path.join(workspace, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, String(file.content || ''), 'utf8');
    }

    const requestedTest = options.testCommand || plan?.testCommand || 'npm test -- --runInBand';
    const parsed = parseCommand(requestedTest);
    if (!parsed || !isAllowedCommand(parsed.cmd)) {
      throw new Error('Test command is not allowed in sandbox');
    }

    const testResult = await runCommand({
      cmd: parsed.cmd,
      args: parsed.args,
      cwd: workspace,
      timeoutMs: Number(process.env.CODE_SANDBOX_TIMEOUT_MS || 120000)
    });

    return {
      workspacePath: workspace,
      toolAllowlist: TOOL_ALLOWLIST,
      testResult,
      filesWritten: files.map((f) => f.path)
    };
  }
}

module.exports = CodeExecutionAgent;

