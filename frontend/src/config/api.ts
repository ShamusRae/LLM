/**
 * Purpose: Central API and WebSocket base URLs for backend and avatar wrapper.
 * Use these instead of hardcoded localhost so the app works on Mac, Linux, and Azure.
 * Reads from globalThis.__VITE_ENV__ (set by main.jsx from import.meta.env) so Jest can run without import.meta.
 * Author: LLM Chat, Last Modified: 2025-02-26
 */

declare global {
  interface Window {
    __VITE_ENV__?: Record<string, string | undefined>;
  }
}

function getViteEnv(key: string): string | undefined {
  const env = (typeof globalThis !== 'undefined' && (globalThis as any).__VITE_ENV__) || (typeof window !== 'undefined' && window.__VITE_ENV__);
  if (env && typeof env[key] === 'string') return env[key];
  return undefined;
}

/**
 * Backend base URL for REST. In dev with Vite proxy, use '' (same origin).
 * In production or when frontend is served separately, set VITE_BACKEND_URL.
 */
export function getBackendBaseUrl(): string {
  const url = getViteEnv('VITE_BACKEND_URL');
  if (url) return url.replace(/\/$/, '');
  return '';
}

/**
 * WebSocket URL for a given path. Uses VITE_BACKEND_WS_ORIGIN if set (e.g. production),
 * otherwise same origin (ws://currentHost/...) so it works with Vite proxy in dev.
 * @param path - Path including leading slash, e.g. '/ws/consulting'
 */
export function getWebSocketUrl(path: string): string {
  const origin = getViteEnv('VITE_BACKEND_WS_ORIGIN');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (origin) {
    return `${origin.replace(/\/$/, '')}${normalizedPath}`;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${normalizedPath}`;
  }
  return `ws://localhost:3001${normalizedPath}`;
}

/**
 * Avatar wrapper (RD-Agent) base URL. Prefer VITE_AVATAR_WRAPPER_URL, else same-origin /api/wrapper or fallback.
 */
export function getAvatarWrapperBaseUrl(): string {
  const url = getViteEnv('VITE_AVATAR_WRAPPER_URL');
  if (url) return url.replace(/\/$/, '');
  return '';
}
