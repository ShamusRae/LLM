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
});

function parseCorsOrigins(value) {
  if (!value || typeof value !== 'string') return null;
  const list = value.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

try {
  const env = envSchema.parse(process.env);
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
