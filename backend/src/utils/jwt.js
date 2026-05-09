import jwt from 'jsonwebtoken';

const DEFAULT_EXPIRES_IN = '7d';

const requireSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return secret;
};

const buildPayload = (user, extra = {}) => ({
  sub: user._id.toString(),
  email: user.email,
  role: user.role,
  /** Token version — must match User.tokenVersion or middleware rejects */
  tv: user.tokenVersion ?? 0,
  ...extra,
});

/**
 * Sign a JWT for the given user.
 * @param {object} user      Mongoose user document (or lean object) with _id, email, role.
 * @param {object} [options]
 * @param {object} [options.payload]  Extra claims to merge into the token.
 * @param {object} [options.signOptions] Overrides forwarded to jsonwebtoken.sign().
 */
export const signToken = (user, { payload = {}, signOptions = {} } = {}) =>
  jwt.sign(
    { ...buildPayload(user, payload), tv: Number(user.tokenVersion ?? 0) },
    requireSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
      ...signOptions,
    },
  );

/** Verify and return the decoded payload. Throws on invalid/expired tokens. */
export const verifyToken = (token) => jwt.verify(token, requireSecret());

/** Decode a token without verifying (for diagnostics / non-auth contexts only). */
export const decodeToken = (token) => jwt.decode(token);
