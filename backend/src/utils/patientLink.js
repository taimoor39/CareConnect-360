import Patient from '../models/Patient.js';

/** Resolve CRM patient linked to auth user (`user` or `userId` on Patient). */
export function findPatientByUserId(userId, projection = null) {
  const q = Patient.findOne({
    $or: [{ user: userId }, { userId: userId }],
  });
  if (projection) return q.select(projection);
  return q;
}

const emailMatchQuery = (email) => ({
  $or: [{ email }, { 'contact.email': email }, { portalAccessEmail: email }],
});

/**
 * Resolve the clinical patient record for a portal login.
 * Falls back to email match when reception registered the chart before portal linkage.
 */
export async function resolvePatientForPortalUser(user, projection = null) {
  if (!user?._id) return null;

  let q = findPatientByUserId(user._id);
  if (projection) q = q.select(projection);
  let patient = await q;
  if (patient) return patient;

  const email = String(user.email || '').trim().toLowerCase();
  if (!email) return null;

  q = Patient.findOne(emailMatchQuery(email)).sort({ updatedAt: -1 });
  if (projection) q = q.select(projection);
  patient = await q;
  if (!patient) return null;

  const existingUserId = patient.userId || patient.user;
  if (existingUserId && String(existingUserId) !== String(user._id)) {
    return null;
  }

  if (!existingUserId) {
    await Patient.updateOne(
      { _id: patient._id },
      { $set: { user: user._id, userId: user._id } },
    );
    patient.user = user._id;
    patient.userId = user._id;
  }

  return patient;
}
