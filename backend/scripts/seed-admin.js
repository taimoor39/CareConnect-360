/**
 * Idempotent admin bootstrap from src/seeders/admin.defaults.json.
 * Run from backend workspace (cwd loads backend/.env): npm run seed:admin
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import { seedAdminFromDefaults } from '../src/seeders/index.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultsPath = path.join(scriptDir, '..', 'src', 'seeders', 'admin.defaults.json');

async function verifyLogin(email, plainPassword) {
  const user = await User.findOne({ email }).select('+password').exec();
  if (!user) return { ok: false, reason: 'user not found after seed' };
  const match = await user.comparePassword(plainPassword);
  return match ? { ok: true } : { ok: false, reason: 'password mismatch' };
}

async function main() {
  await connectDB();
  try {
    const defaults = JSON.parse(await readFile(defaultsPath, 'utf8'));
    const email = String(defaults.email || '')
      .toLowerCase()
      .trim();
    const password = String(defaults.password || '');

    const results = await seedAdminFromDefaults();
    console.log('Seed results:', JSON.stringify(results, null, 2));

    const login = await verifyLogin(email, password);
    if (!login.ok) {
      console.error('Login verification failed:', login.reason);
      process.exitCode = 1;
      return;
    }
    console.log('Login verification: password matches for', email);
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
