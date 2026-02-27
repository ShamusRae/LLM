// Purpose: Test WhatsApp message normalization behavior.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const whatsappService = require('../../services/whatsappService');

describe('whatsappService.normalizeInboundMessage', () => {
  test('normalizes direct payload with from/text', () => {
    const payload = { from: '447700900123', text: 'Hello' };
    const parsed = whatsappService.normalizeInboundMessage(payload);
    expect(parsed.from).toBe('+447700900123');
    expect(parsed.text).toBe('Hello');
    expect(parsed.type).toBe('text');
  });

  test('normalizes nested messages payload', () => {
    const payload = {
      messages: [{
        from: '+14155550123',
        message: { conversation: 'Portfolio update' }
      }]
    };
    const parsed = whatsappService.normalizeInboundMessage(payload);
    expect(parsed.from).toBe('+14155550123');
    expect(parsed.text).toBe('Portfolio update');
  });
});

