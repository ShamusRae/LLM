/**
 * Unit tests for config/api (getBackendBaseUrl, getWebSocketUrl, getAvatarWrapperBaseUrl).
 */

import {
  getBackendBaseUrl,
  getWebSocketUrl,
  getAvatarWrapperBaseUrl,
} from '../api';

describe('config/api', () => {
  describe('getBackendBaseUrl', () => {
    it('returns a string', () => {
      expect(typeof getBackendBaseUrl()).toBe('string');
    });

    it('returns empty string when VITE_BACKEND_URL is not set (same-origin)', () => {
      // In Jest, import.meta.env is typically undefined, so we get ''
      expect(getBackendBaseUrl()).toBe('');
    });
  });

  describe('getWebSocketUrl', () => {
    it('returns a string containing the path', () => {
      const url = getWebSocketUrl('/ws/consulting');
      expect(typeof url).toBe('string');
      expect(url).toContain('/ws/consulting');
    });

    it('normalizes path without leading slash', () => {
      const url = getWebSocketUrl('ws/consulting');
      expect(url).toMatch(/\/ws\/consulting$/);
    });

    it('uses ws protocol when window.location is http', () => {
      const origLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', host: 'localhost:5173' },
        writable: true,
      });
      const url = getWebSocketUrl('/ws/consulting');
      expect(url).toBe('ws://localhost:5173/ws/consulting');
      Object.defineProperty(window, 'location', { value: origLocation, writable: true });
    });

    it('uses wss protocol when window.location is https', () => {
      const origLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', host: 'app.example.com' },
        writable: true,
      });
      const url = getWebSocketUrl('/ws/consulting');
      expect(url).toBe('wss://app.example.com/ws/consulting');
      Object.defineProperty(window, 'location', { value: origLocation, writable: true });
    });
  });

  describe('getAvatarWrapperBaseUrl', () => {
    it('returns a string', () => {
      expect(typeof getAvatarWrapperBaseUrl()).toBe('string');
    });

    it('returns empty string when VITE_AVATAR_WRAPPER_URL is not set', () => {
      expect(getAvatarWrapperBaseUrl()).toBe('');
    });
  });
});
