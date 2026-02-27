// Purpose: Unit tests for config (getPublicBaseUrl, getCorsOrigins).
// Author: LLM Chat, Last Modified: 2025-02-26

const path = require('path');
const { getPublicBaseUrl, getCorsOrigins } = require('../../config');

describe('config', () => {
  describe('getPublicBaseUrl', () => {
    it('returns a string starting with http', () => {
      const url = getPublicBaseUrl();
      expect(typeof url).toBe('string');
      expect(url).toMatch(/^https?:\/\//);
    });

    it('includes localhost when PUBLIC_HOST is not set', () => {
      if (!process.env.PUBLIC_HOST) {
        const url = getPublicBaseUrl();
        expect(url).toMatch(/localhost/);
        expect(url).toMatch(/\d+/); // port
      }
    });

    it('has no trailing slash', () => {
      const url = getPublicBaseUrl();
      expect(url.endsWith('/')).toBe(false);
    });
  });

  describe('getCorsOrigins', () => {
    it('returns an array', () => {
      const origins = getCorsOrigins();
      expect(Array.isArray(origins)).toBe(true);
    });

    it('returns at least one origin', () => {
      const origins = getCorsOrigins();
      expect(origins.length).toBeGreaterThan(0);
    });

    it('each origin is a non-empty string', () => {
      const origins = getCorsOrigins();
      origins.forEach((origin) => {
        expect(typeof origin).toBe('string');
        expect(origin.length).toBeGreaterThan(0);
      });
    });

    it('includes localhost dev origins when CORS_ORIGINS not set', () => {
      if (!process.env.CORS_ORIGINS) {
        const origins = getCorsOrigins();
        expect(origins.some((o) => o.includes('localhost:5173'))).toBe(true);
      }
    });
  });
});
