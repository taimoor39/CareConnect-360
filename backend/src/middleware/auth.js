import User from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';
import { findPatientByUserId } from '../utils/patientLink.js';

/**
 * Authenticate the request by verifying the Bearer token.
 *
 * Security notes:
 *  - Uses `.select('+password')` nowhere — the password hash is never
 *    loaded into `req.user`.
 *  - Token errors (expired, malformed, bad signature) all return the same
 *    generic 401 message so attackers cannot distinguish failure modes.
 *  - The `.lean()` call returns a plain object, preventing accidental
 *    `.save()` mutations on req.user in downstream middleware.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const payload = verifyToken(header.slice(7));
    const user = await User.findById(payload.sub).select('-password').lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const tokenVersion = Number(payload.tv ?? 0);
    const currentVersion = Number(user.tokenVersion ?? 0);
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({ success: false, message: 'Session expired — please sign in again' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account suspended — contact an administrator' });
    }

    req.user = user;
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Restrict access to the listed roles.
 * Must run after `requireAuth` so `req.user` is populated.
 */
export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to perform this action' });
  }

  return next();
};

export const protect = requireAuth;

/**
 * For role `patient`, enforce approved portal access on APIs that accept patient JWTs
 * (/api/patient, /api/appointments, /api/billing). Pending self-reg stays blocked even with an old token.
 */
export const requireApprovedPatientPortal = async (req, res, next) => {
  if (!req.user || req.user.role !== 'patient') {
    return next();
  }

  try {
    const patient = await findPatientByUserId(req.user._id)
      .select('portalAccessStatus portalAccessRejectionReason')
      .lean();

    if (!patient) {
      return res.status(403).json({
        success: false,
        message: 'No patient record is linked to this account. Contact your clinic.',
      });
    }

    if (patient.portalAccessStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message:
          'Your portal access is pending administrator approval. Please wait for the clinic to approve your registration.',
      });
    }

    if (patient.portalAccessStatus === 'rejected') {
      const reason = patient.portalAccessRejectionReason
        ? ` ${patient.portalAccessRejectionReason}`
        : '';
      return res.status(403).json({
        success: false,
        message: `Portal access was not approved.${reason} Contact your clinic if you need help.`,
      });
    }

    return next();
  } catch {
    return res.status(500).json({ success: false, message: 'Could not verify portal access' });
  }
};
