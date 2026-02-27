// Purpose: Test WhatsApp allowlist normalization and enforcement.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const allowlistMiddleware = require('../../middleware/whatsappAllowlist');
const { parseAllowlist, toE164 } = require('../../services/whatsapp/phoneUtils');

describe('whatsapp phone utilities', () => {
  test('normalizes E.164 numbers', () => {
    expect(toE164('+447700900123')).toBe('+447700900123');
    expect(toE164('447700900123')).toBe('+447700900123');
    expect(toE164('invalid-number')).toBeNull();
  });

  test('parses allowlist csv values', () => {
    const list = parseAllowlist('+447700900123, 447700900124,invalid');
    expect(list).toEqual(['+447700900123', '+447700900124']);
  });
});

describe('whatsappAllowlist middleware', () => {
  const originalEnv = process.env.WHATSAPP_ALLOWED_NUMBERS;

  afterEach(() => {
    process.env.WHATSAPP_ALLOWED_NUMBERS = originalEnv;
  });

  test('blocks when sender is not allowlisted', () => {
    process.env.WHATSAPP_ALLOWED_NUMBERS = '+447700900123';
    const req = { body: { from: '+447700900999' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    allowlistMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('allows request for owner number', () => {
    process.env.WHATSAPP_ALLOWED_NUMBERS = '+447700900123';
    const req = { body: { from: '447700900123' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    allowlistMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.whatsappSender).toBe('+447700900123');
  });
});

