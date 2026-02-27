// Purpose: Normalize and validate WhatsApp phone identifiers.
// Author: LLM Chat, Last Modified: 2026-02-27
'use strict';

function toE164(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const normalized = trimmed.replace(/[^\d+]/g, '');
  if (!normalized) return null;

  const withPlus = normalized.startsWith('+') ? normalized : `+${normalized}`;
  const digits = withPlus.slice(1);
  if (!/^\d{8,15}$/.test(digits)) return null;
  return withPlus;
}

function toWhatsAppJid(e164) {
  const normalized = toE164(e164);
  if (!normalized) return null;
  return `${normalized.slice(1)}@s.whatsapp.net`;
}

function fromJidToE164(jid) {
  if (!jid) return null;
  const digits = String(jid).split('@')[0].replace(/[^\d]/g, '');
  return toE164(digits);
}

function parseAllowlist(csv) {
  if (!csv) return [];
  return String(csv)
    .split(',')
    .map((v) => toE164(v))
    .filter(Boolean);
}

module.exports = {
  toE164,
  toWhatsAppJid,
  fromJidToE164,
  parseAllowlist
};

