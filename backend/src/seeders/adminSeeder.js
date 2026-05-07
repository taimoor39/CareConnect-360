import User from '../models/User.js';

export const seedAdmin = async (options = {}) => {
  const email = String(options.email || '').toLowerCase().trim();
  const password = String(options.password || '');
  const name = String(options.name || 'System Admin').trim();
  const phone = String(options.phone || '03000000000').trim();

  if (!email || !password) {
    return {
      name: 'admin',
      status: 'skipped',
      reason: 'admin email or password is missing',
    };
  }

  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    return {
      name: 'admin',
      status: 'skipped',
      reason: 'admin already exists',
      email,
    };
  }

  const admin = await User.create({
    name,
    email,
    phone,
    password,
    role: 'admin',
  });

  return {
    name: 'admin',
    status: 'created',
    userId: admin._id,
    email,
  };
};
