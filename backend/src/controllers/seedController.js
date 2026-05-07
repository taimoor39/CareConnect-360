import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runConfiguredSeeders } from '../seeders/index.js';
import asyncHandler from '../utils/asyncHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

const resolveSeedersConfigPath = () => {
  const configured = process.env.SEEDERS_CONFIG_PATH || 'src/config/seeders.json';
  return path.isAbsolute(configured) ? configured : path.resolve(backendRoot, configured);
};

export const runSeeders = asyncHandler(async (_req, res) => {
  const raw = await readFile(resolveSeedersConfigPath(), 'utf8');
  const config = JSON.parse(raw);
  const results = await runConfiguredSeeders(config);
  res.json({ success: true, results });
});
