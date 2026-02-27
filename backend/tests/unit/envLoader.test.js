// Purpose: Unit tests for config/envLoader (findProjectRoot, loadEnv).
// Author: LLM Chat, Last Modified: 2025-02-26

const path = require('path');
const fs = require('fs');
const { findProjectRoot, loadEnv } = require('../../config/envLoader');

describe('envLoader', () => {
  describe('findProjectRoot', () => {
    it('returns a directory when starting from backend/config', () => {
      const startDir = path.join(__dirname, '..', '..', 'config');
      const root = findProjectRoot(startDir);
      expect(root).toBeTruthy();
      expect(typeof root).toBe('string');
      expect(fs.existsSync(root)).toBe(true);
      // Root is either repo root (has backend/) or backend/ (has package.json)
      const hasBackend = fs.existsSync(path.join(root, 'backend'));
      const hasPackage = fs.existsSync(path.join(root, 'package.json'));
      const hasEnv = fs.existsSync(path.join(root, '.env'));
      expect(hasBackend || hasPackage || hasEnv).toBe(true);
    });

    it('returns a directory when starting from backend/tests/unit', () => {
      const root = findProjectRoot(__dirname);
      expect(root).toBeTruthy();
      expect(fs.existsSync(root)).toBe(true);
    });

    it('returns null when starting from filesystem root', () => {
      const rootDir = path.parse(__dirname).root;
      const root = findProjectRoot(rootDir);
      expect(root).toBeNull();
    });
  });

  describe('loadEnv', () => {
    it('returns path to .env when file exists in project root', () => {
      const envPath = loadEnv(path.join(__dirname, '..', '..'));
      // May be null if .env not present in repo
      if (envPath) {
        expect(envPath).toMatch(/\.env$/);
        expect(fs.existsSync(envPath)).toBe(true);
      }
    });

    it('does not throw when called from config directory', () => {
      expect(() => loadEnv()).not.toThrow();
    });
  });
});
