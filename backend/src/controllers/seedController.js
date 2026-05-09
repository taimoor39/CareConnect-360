import { seedAdminFromDefaults } from '../seeders/index.js';
import asyncHandler from '../utils/asyncHandler.js';

export const runSeeders = asyncHandler(async (_req, res) => {
  const results = await seedAdminFromDefaults();
  res.json({ success: true, results });
});
