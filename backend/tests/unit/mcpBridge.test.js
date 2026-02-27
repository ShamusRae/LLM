// Purpose: Unit tests for MCP bridge (delegation to server).
// Author: LLM Chat, Last Modified: 2025-02-26

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const os = require('os');

const mockServer = {
  getAvailableTools: jest.fn().mockReturnValue([
    { id: 'test-tool', name: 'Test Tool', description: 'A test' }
  ]),
  getFunctionDefinitions: jest.fn().mockReturnValue([
    { id: 'test-tool', name: 'test_tool', description: 'A test', parameters: {} }
  ]),
  callToolDirectly: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  executeFunction: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })
};

describe('mcpBridge', () => {
  let bridge;

  beforeEach(() => {
    bridge = require('../../services/mcpBridge');
    bridge.setServer(mockServer);
    jest.clearAllMocks();
  });

  afterEach(() => {
    bridge.setServer(null);
    bridge.setAdapter(null);
    bridge.resetBridgeState();
    delete process.env.MCP_BRIDGE_PROVIDER;
    delete process.env.MCP_BRIDGE_SERVER;
    delete process.env.MCP_BRIDGE_STRICT;
    delete process.env.MCP_BRIDGE_CONFIG_PATH;
    delete process.env.MCPORTER_COMMAND;
    delete process.env.MCPORTER_ARGS;
  });

  describe('listTools', () => {
    test('delegates to server.getAvailableTools and returns result', () => {
      const result = bridge.listTools();
      expect(mockServer.getAvailableTools).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'test-tool', name: 'Test Tool' });
    });
  });

  describe('getFunctionDefinitions', () => {
    test('delegates to server.getFunctionDefinitions and returns result', () => {
      const result = bridge.getFunctionDefinitions();
      expect(mockServer.getFunctionDefinitions).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test_tool');
    });
  });

  describe('callTool', () => {
    test('delegates to server.callToolDirectly with toolId and params', async () => {
      const result = await bridge.callTool('yahoo-finance-stock-metric', { symbol: 'AAPL' });
      expect(mockServer.callToolDirectly).toHaveBeenCalledWith('yahoo-finance-stock-metric', { symbol: 'AAPL' });
      expect(result).toMatchObject({ content: [{ type: 'text', text: 'ok' }] });
    });

    test('passes empty object when params omitted', async () => {
      await bridge.callTool('test-tool');
      expect(mockServer.callToolDirectly).toHaveBeenCalledWith('test-tool', {});
    });
  });

  describe('executeFunction', () => {
    test('delegates to server.executeFunction with function name and args', async () => {
      const result = await bridge.executeFunction('yahoo_finance_stock_metric', { symbol: 'AAPL' });
      expect(mockServer.executeFunction).toHaveBeenCalledWith('yahoo_finance_stock_metric', { symbol: 'AAPL' });
      expect(result).toMatchObject({ content: [{ type: 'text', text: 'ok' }] });
    });
  });

  describe('mcporter fallback and diagnostics', () => {
    test('returns diagnostics payload', () => {
      const diagnostics = bridge.getBridgeDiagnostics();
      expect(diagnostics).toHaveProperty('provider');
      expect(diagnostics).toHaveProperty('nodeVersion');
      expect(diagnostics).toHaveProperty('mcporterNodeCompatible');
    });

    test('reads bridge config from file when MCP_BRIDGE_CONFIG_PATH is set', () => {
      const filePath = path.join(os.tmpdir(), `mcp-bridge-${Date.now()}.json`);
      fs.writeFileSync(filePath, JSON.stringify({
        provider: 'mcporter',
        strictMode: true,
        server: 'finance',
        command: 'node',
        args: ['mock-mcporter'],
        pathPrefix: '/opt/homebrew/bin:/usr/local/bin'
      }), 'utf8');

      process.env.MCP_BRIDGE_CONFIG_PATH = filePath;
      bridge.resetBridgeState();

      const diagnostics = bridge.getBridgeDiagnostics();
      expect(diagnostics.provider).toBe('mcporter');
      expect(diagnostics.strictMode).toBe(true);
      expect(diagnostics.configuredServer).toBe('finance');
      expect(diagnostics.command).toBe('node');
      expect(diagnostics.pathPrefix).toBe('/opt/homebrew/bin:/usr/local/bin');

      fs.unlinkSync(filePath);
    });

    test('falls back to internal adapter when mcporter is selected but Node is incompatible', async () => {
      process.env.MCP_BRIDGE_PROVIDER = 'mcporter';
      process.env.MCP_BRIDGE_SERVER = 'dummy';
      process.env.MCP_BRIDGE_STRICT = 'false';
      bridge.setAdapter(null);

      const result = await bridge.callTool('test-tool', { a: 1 });
      expect(mockServer.callToolDirectly).toHaveBeenCalledWith('test-tool', { a: 1 });
      expect(result).toMatchObject({ content: [{ type: 'text', text: 'ok' }] });
    });
  });
});
