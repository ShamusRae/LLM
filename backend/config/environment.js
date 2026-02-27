// Purpose: Validated environment config; .env loaded via envLoader from project root.
// Author: LLM Chat, Last Modified: 2025-02-26

'use strict';

const zod = require('zod');
const { loadEnv } = require('./envLoader');

loadEnv();

const envSchema = zod.object({
  NODE_ENV: zod.string().default('development'),
  PORT: zod.string().default('3001'),
  PUBLIC_HOST: zod.string().optional(), // e.g. 'https://api.example.com' for callbacks/links
  CORS_ORIGINS: zod.string().optional(), // comma-separated list of allowed origins
  OPENAI_API_KEY: zod.string().optional(),
  CLAUDE_API_KEY: zod.string().optional(),
  ANTHROPIC_API_KEY: zod.string().optional(),
  WHATSAPP_ENABLED: zod.string().optional(),
  WHATSAPP_MODE: zod.string().optional(),
  WHATSAPP_ALLOWED_NUMBERS: zod.string().optional(),
  WHATSAPP_WEBHOOK_TOKEN: zod.string().optional(),
  WHATSAPP_ALLOW_MEDIA: zod.string().optional(),
  WHATSAPP_MAX_TEXT_CHARS: zod.string().optional(),
  WHATSAPP_RATE_LIMIT_PER_MINUTE: zod.string().optional(),
  WHATSAPP_BAILEYS_STATE_DIR: zod.string().optional(),
});

function parseCorsOrigins(value) {
  if (!value || typeof value !== 'string') return null;
  const list = value.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

function isValidE164List(csv) {
  if (!csv) return true;
  const numbers = String(csv).split(',').map((v) => v.trim()).filter(Boolean);
  if (numbers.length === 0) return false;
  return numbers.every((number) => /^\+[1-9]\d{7,14}$/.test(number));
}

try {
  const env = envSchema.parse(process.env);
  if (env.WHATSAPP_ENABLED === 'true' && !env.WHATSAPP_ALLOWED_NUMBERS) {
    throw new Error('WHATSAPP_ALLOWED_NUMBERS is required when WHATSAPP_ENABLED=true');
  }
  if (!isValidE164List(env.WHATSAPP_ALLOWED_NUMBERS)) {
    throw new Error('WHATSAPP_ALLOWED_NUMBERS must be a comma-separated E.164 list');
  }
  const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS);

  module.exports = {
    ...env,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY,
    CORS_ORIGINS_LIST: corsOrigins,
  };
} catch (error) {
  console.error('❌ Invalid environment variables:', error.format());
  process.exit(1);
}
