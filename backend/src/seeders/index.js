import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { seedAdmin } from './adminSeeder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadAdminDefaults() {
  const filePath = path.join(__dirname, 'admin.defaults.json');
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export { seedAdmin };

/**
 * Bootstrap entry point: creates the default admin from `admin.defaults.json` if missing.
 * Returns a one-element results array (same shape as the legacy multi-seeder runner).
 */
export async function seedAdminFromDefaults() {
  const defaults = await loadAdminDefaults();
  const result = await seedAdmin(defaults);
  return [result];
}
