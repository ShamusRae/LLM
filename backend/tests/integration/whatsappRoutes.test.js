// Purpose: Integration coverage for WhatsApp inbound channel security.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const request = require('supertest');

jest.mock('../../services/chatService', () => ({
  processChat: jest.fn().mockResolvedValue({
    responses: [{ response: 'reply from assistant' }]
  })
}));

jest.mock('../../services/whatsappService', () => ({
  normalizeInboundMessage: jest.fn((payload) => ({
    from: payload.from,
    text: payload.text,
    type: 'text',
    raw: payload
  })),
  sendMessage: jest.fn().mockResolvedValue({ delivered: true, mode: 'webhook-mock' }),
  getStatus: jest.fn().mockReturnValue({ enabled: false, connected: false, mode: 'webhook' })
}));

const app = require('../../app');
const chatService = require('../../services/chatService');
const whatsappService = require('../../services/whatsappService');

describe('WhatsApp routes', () => {
  const originalAllowlist = process.env.WHATSAPP_ALLOWED_NUMBERS;

  afterEach(() => {
    process.env.WHATSAPP_ALLOWED_NUMBERS = originalAllowlist;
    jest.clearAllMocks();
  });

  test('blocks unauthorized sender before model invocation', async () => {
    process.env.WHATSAPP_ALLOWED_NUMBERS = '+447700900123';
    const response = await request(app)
      .post('/api/whatsapp/inbound')
      .send({ from: '+447700900999', text: 'hello' });

    expect(response.status).toBe(403);
    expect(chatService.processChat).not.toHaveBeenCalled();
  });

  test('processes allowed sender and returns success', async () => {
    process.env.WHATSAPP_ALLOWED_NUMBERS = '+447700900123';
    const response = await request(app)
      .post('/api/whatsapp/inbound')
      .send({ from: '+447700900123', text: 'hello' });

    expect(response.status).toBe(200);
    expect(chatService.processChat).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
  });
});

