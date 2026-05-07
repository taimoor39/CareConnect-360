import { seedAdmin } from './adminSeeder.js';
import { seedMenus } from './menuSeeder.js';

const registeredSeeders = {
  admin: seedAdmin,
  menus: seedMenus,
};

export const runConfiguredSeeders = async (config = {}) => {
  const seedQueue = Array.isArray(config.seeders) && config.seeders.length > 0 ? config.seeders : ['admin'];
  const results = [];

  for (const seederName of seedQueue) {
    const seeder = registeredSeeders[seederName];

    if (!seeder) {
      results.push({
        name: seederName,
        status: 'skipped',
        reason: 'seeder is not registered yet',
      });
      continue;
    }

    const options = config[seederName] || {};
    const result = await seeder(options);
    results.push(result);
  }

  return results;
};
