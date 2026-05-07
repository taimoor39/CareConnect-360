import Patient from '../models/Patient.js';

/** Resolve CRM patient linked to auth user (`user` or `userId` on Patient). */
export function findPatientByUserId(userId, projection = null) {
  const q = Patient.findOne({
    $or: [{ user: userId }, { userId: userId }],
  });
  if (projection) return q.select(projection);
  return q;
}
