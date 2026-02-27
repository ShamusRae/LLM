// Purpose: Load .env from project root so backend works from any cwd (e.g. backend/ or repo root).
// Author: LLM Chat, Last Modified: 2025-02-26

'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Find project root by walking up from dir until we find a directory containing both
 * package.json (or .env) and a backend/ folder (or we hit filesystem root).
 * @param {string} startDir - Directory to start from (e.g. __dirname)
 * @returns {string|null} - Absolute path to project root or null
 */
function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (dir !== root) {
    const hasEnv = fs.existsSync(path.join(dir, '.env'));
    const hasPackage = fs.existsSync(path.join(dir, 'package.json'));
    const hasBackend = fs.existsSync(path.join(dir, 'backend'));
    if ((hasEnv || hasPackage) && (hasBackend || hasEnv)) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  return null;
}

/**
 * Load dotenv from project root. Safe to call multiple times; dotenv does not overwrite existing env.
 * @param {string} [fromDir] - Directory to start searching (default: __dirname of this file)
 * @returns {string|null} - Path to loaded .env file or null if not found
 */
function loadEnv(fromDir) {
  const dotenv = require('dotenv');
  const start = fromDir || path.join(__dirname, '..');
  const root = findProjectRoot(start);
  if (!root) return null;
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return null;
  dotenv.config({ path: envPath });
  return envPath;
}

module.exports = {
  findProjectRoot,
  loadEnv,
};
