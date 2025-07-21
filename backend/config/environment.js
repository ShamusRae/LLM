'use strict';

const dotenv = require('dotenv');
const zod = require('zod');

dotenv.config();

const envSchema = zod.object({
  NODE_ENV: zod.string().default('development'),
  PORT: zod.string().default('3001'),
  OPENAI_API_KEY: zod.string().optional(),
  CLAUDE_API_KEY: zod.string().optional(),
  ANTHROPIC_API_KEY: zod.string().optional(),
});

try {
  const env = envSchema.parse(process.env);
  
  module.exports = {
    ...env,
    // Combine Claude and Anthropic keys for convenience
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY,
  };
  
} catch (error) {
  console.error('❌ Invalid environment variables:', error.format());
  process.exit(1);
} 