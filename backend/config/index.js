// Purpose: Central config export; env + getPublicBaseUrl for callbacks and asset URLs.
// Author: LLM Chat, Last Modified: 2025-02-26

'use strict';

const env = require('./environment');

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

/**
 * Public base URL for this backend (for callbacks, avatar/image URLs, etc.).
 * Uses PUBLIC_HOST if set (e.g. production), otherwise http://localhost:PORT.
 * @returns {string}
 */
function getPublicBaseUrl() {
  if (env.PUBLIC_HOST) {
    return env.PUBLIC_HOST.replace(/\/$/, '');
  }
  const port = env.PORT || '3001';
  return `http://localhost:${port}`;
}

/**
 * CORS allowed origins. Uses CORS_ORIGINS env if set, else default localhost dev origins.
 * @returns {string[]}
 */
function getCorsOrigins() {
  return env.CORS_ORIGINS_LIST || DEFAULT_ORIGINS;
}

module.exports = {
  ...env,
  getPublicBaseUrl,
  getCorsOrigins,
};
