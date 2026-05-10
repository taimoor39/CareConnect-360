import crypto from 'crypto';

import User from '../models/User.js';

export const hashVerificationToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

/** Persists hashed token + 48h expiry; returns plain token for the email link. */
export async function issuePlainVerificationToken(user) {
  const plain = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = hashVerificationToken(plain);
  user.emailVerificationExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await user.save();
  return plain;
}

export async function clearVerificationFieldsByUserId(userId) {
  await User.updateOne(
    { _id: userId },
    { $unset: { emailVerificationToken: 1, emailVerificationExpiry: 1 } },
  );
}
