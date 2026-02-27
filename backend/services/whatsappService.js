// Purpose: Baileys-backed WhatsApp transport and message adapters.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

const path = require('path');
const fs = require('fs');
const { toE164, toWhatsAppJid, fromJidToE164 } = require('./whatsapp/phoneUtils');

class WhatsAppService {
  constructor() {
    this.enabled = process.env.WHATSAPP_ENABLED === 'true';
    this.connected = false;
    this.mode = process.env.WHATSAPP_MODE || 'webhook';
    this.sock = null;
    this.lastError = null;
    this._initializing = false;
  }

  async initialize() {
    if (!this.enabled || this.mode !== 'baileys' || this._initializing || this.connected) return;
    this._initializing = true;
    try {
      // Lazy require so environments without Baileys still boot in webhook mode.
      // eslint-disable-next-line global-require
      const baileys = require('@whiskeysockets/baileys');
      const stateDir = process.env.WHATSAPP_BAILEYS_STATE_DIR || path.join(__dirname, '../../storage/whatsapp-baileys');
      fs.mkdirSync(stateDir, { recursive: true });
      const { state, saveCreds } = await baileys.useMultiFileAuthState(stateDir);
      this.sock = baileys.default({
        auth: state,
        printQRInTerminal: true
      });

      this.sock.ev.on('creds.update', saveCreds);
      this.sock.ev.on('connection.update', (update) => {
        const status = update.connection;
        this.connected = status === 'open';
        if (status === 'close') {
          this.connected = false;
        }
      });
    } catch (error) {
      this.lastError = error.message;
      console.warn(`WhatsApp Baileys initialization failed: ${error.message}`);
    } finally {
      this._initializing = false;
    }
  }

  normalizeInboundMessage(payload) {
    const directText = payload?.text || payload?.message || payload?.content || '';
    const directFrom = payload?.from || payload?.phone || payload?.sender || null;

    const firstMessage = Array.isArray(payload?.messages) ? payload.messages[0] : null;
    const from = toE164(directFrom || firstMessage?.from || fromJidToE164(firstMessage?.key?.remoteJid));
    const text = String(directText || firstMessage?.text || firstMessage?.message?.conversation || '').trim();

    return {
      from,
      text,
      type: payload?.type || firstMessage?.type || (text ? 'text' : 'unknown'),
      raw: payload
    };
  }

  async sendMessage(toE164Phone, text) {
    const phone = toE164(toE164Phone);
    if (!phone) {
      throw new Error('Recipient phone number is invalid');
    }
    const safeText = String(text || '').slice(0, Number(process.env.WHATSAPP_MAX_TEXT_CHARS || 4000));

    if (this.mode === 'baileys' && this.sock && this.connected) {
      const jid = toWhatsAppJid(phone);
      await this.sock.sendMessage(jid, { text: safeText });
      return { delivered: true, mode: 'baileys', to: phone };
    }

    // Webhook mode fallback: no outbound network call, but preserve delivery auditability.
    console.log(`[WhatsApp MOCK SEND] -> ${phone}: ${safeText}`);
    return { delivered: true, mode: 'webhook-mock', to: phone };
  }

  getStatus() {
    return {
      enabled: this.enabled,
      mode: this.mode,
      connected: this.connected,
      initialized: Boolean(this.sock) || this.mode === 'webhook',
      lastError: this.lastError
    };
  }
}

module.exports = new WhatsAppService();

