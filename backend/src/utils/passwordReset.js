import crypto from 'crypto';

import User from '../models/User.js';

export const hashResetToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** Persists hashed token + 1h expiry; returns plain token for the email link. */
export async function issuePlainResetToken(user) {
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = hashResetToken(resetToken);
  user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  return resetToken;
}

export async function clearResetFieldsByUserId(userId) {
  await User.updateOne({ _id: userId }, { $unset: { passwordResetToken: 1, passwordResetExpiry: 1 } });
}
