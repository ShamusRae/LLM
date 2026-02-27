// Purpose: MCP bridge abstraction — pluggable adapters with internal fallback.
// Author: LLM Chat, Last Modified: 2025-02-26
'use strict';

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

let _server = null;
let _adapter = null;
let _config = null;

function getNodeMajorVersion() {
  const major = String(process.versions.node || '0').split('.')[0];
  return parseInt(major, 10) || 0;
}

function isMcporterNodeCompatible() {
  return getNodeMajorVersion() >= 20;
}

function getConfigPath() {
  // Prefer explicit path, then backend-local config.
  return process.env.MCP_BRIDGE_CONFIG_PATH || path.join(__dirname, '../config/mcp-bridge.json');
}

function loadBridgeConfig() {
  if (_config) return _config;

  const defaults = {
    provider: process.env.MCP_BRIDGE_PROVIDER || 'internal',
    strictMode: process.env.MCP_BRIDGE_STRICT === 'true',
    server: process.env.MCP_BRIDGE_SERVER || '',
    command: process.env.MCPORTER_COMMAND || 'npx',
    args: (process.env.MCPORTER_ARGS || 'mcporter').split(/\s+/).filter(Boolean),
    pathPrefix: process.env.MCP_BRIDGE_PATH_PREFIX || '',
    configPath: getConfigPath()
  };

  try {
    if (fs.existsSync(defaults.configPath)) {
      const parsed = JSON.parse(fs.readFileSync(defaults.configPath, 'utf8'));
      _config = {
        ...defaults,
        ...parsed,
        args: Array.isArray(parsed.args) ? parsed.args : defaults.args
      };
      return _config;
    }
  } catch (error) {
    console.warn(`⚠️ MCP bridge config read failed (${defaults.configPath}): ${error.message}`);
  }

  _config = defaults;
  return _config;
}

function getServer() {
  if (!_server) {
    const { mcpServer } = require('./mcpService');
    _server = mcpServer;
  }
  return _server;
}

function internalAdapter() {
  const server = getServer();
  return {
    listTools: () => server.getAvailableTools(),
    getFunctionDefinitions: () => server.getFunctionDefinitions(),
    callTool: (toolId, params) => server.callToolDirectly(toolId, params || {}),
    executeFunction: (functionName, args) => server.executeFunction(functionName, args || {})
  };
}

function mapFunctionNameToToolId(functionName) {
  return String(functionName || '').replace(/_/g, '-');
}

function mcporterAdapter() {
  const bridgeConfig = loadBridgeConfig();
  const command = bridgeConfig.command;
  const baseArgs = bridgeConfig.args;
  const strictMode = bridgeConfig.strictMode;
  const defaultServer = bridgeConfig.server;
  const pathPrefix = bridgeConfig.pathPrefix || '';

  async function runMcporter(args) {
    const env = { ...process.env };
    if (pathPrefix) {
      env.PATH = `${pathPrefix}:${env.PATH || ''}`;
    }
    const { stdout } = await execFileAsync(command, [...baseArgs, ...args], {
      env,
      maxBuffer: 2 * 1024 * 1024
    });
    return stdout;
  }

  const adapter = {
    listTools: () => internalAdapter().listTools(),
    getFunctionDefinitions: () => internalAdapter().getFunctionDefinitions(),
    callTool: async (toolId, params) => {
      if (!isMcporterNodeCompatible()) {
        const message = `mcporter requires Node >=20 (current ${process.versions.node})`;
        if (strictMode) {
          throw new Error(message);
        }
        console.warn(`⚠️ MCP bridge fallback: ${message}`);
        return internalAdapter().callTool(toolId, params);
      }
      if (!defaultServer) {
        if (strictMode) {
          throw new Error('MCP_BRIDGE_SERVER is required for mcporter adapter');
        }
        return internalAdapter().callTool(toolId, params);
      }
      try {
        const flatArgs = Object.entries(params || {}).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`);
        const stdout = await runMcporter(['call', `${defaultServer}.${toolId}`, ...flatArgs]);
        return { content: [{ type: 'text', text: stdout.trim() }] };
      } catch (error) {
        if (strictMode) {
          throw error;
        }
        return internalAdapter().callTool(toolId, params);
      }
    },
    executeFunction: async (functionName, args) => {
      const toolId = mapFunctionNameToToolId(functionName);
      return adapter.callTool(toolId, args);
    }
  };
  return adapter;
}

function getAdapter() {
  if (_adapter) return _adapter;

  const provider = loadBridgeConfig().provider;
  if (provider === 'mcporter') {
    _adapter = mcporterAdapter();
  } else {
    _adapter = internalAdapter();
  }
  return _adapter;
}

function getBridgeDiagnostics() {
  const cfg = loadBridgeConfig();
  return {
    provider: cfg.provider,
    nodeVersion: process.versions.node,
    mcporterNodeCompatible: isMcporterNodeCompatible(),
    strictMode: cfg.strictMode,
    configuredServer: cfg.server || null,
    configPath: cfg.configPath,
    command: cfg.command,
    args: cfg.args,
    pathPrefix: cfg.pathPrefix || null
  };
}

function setServer(server) {
  _server = server;
  _adapter = null;
}

function setAdapter(adapter) {
  _adapter = adapter;
}

function resetBridgeState() {
  _adapter = null;
  _config = null;
}

function listTools() {
  return getAdapter().listTools();
}

function getFunctionDefinitions() {
  return getAdapter().getFunctionDefinitions();
}

async function callTool(toolId, params) {
  return getAdapter().callTool(toolId, params || {});
}

async function executeFunction(functionName, args) {
  return getAdapter().executeFunction(functionName, args || {});
}

module.exports = {
  listTools,
  getFunctionDefinitions,
  callTool,
  executeFunction,
  setServer,
  getServer,
  setAdapter,
  getBridgeDiagnostics,
  resetBridgeState
};
