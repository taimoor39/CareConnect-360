import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Standard security headers (X-Content-Type-Options, X-Frame-Options,
 * Strict-Transport-Security, etc.).
 */
export const securityHeaders = helmet();

const isLocalIp = (ip = '') => (
  ip === '127.0.0.1'
  || ip === '::1'
  || ip.startsWith('::ffff:127.0.0.1')
);

const DEFAULT_GLOBAL_WINDOW_MS = 15 * 60 * 1000;
const defaultGlobalMax = () => (process.env.NODE_ENV === 'production' ? 1000 : 10000);

/** Parse a positive integer from env; invalid or missing values use `fallback`. */
const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Global rate limiter — tuned via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
 * When unset: 15-minute window; max 1000 (production) or 10000 (non-production).
 * Localhost and `/health` are skipped so dev health checks do not consume quota.
 */
const globalWindowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_GLOBAL_WINDOW_MS);
const globalMax = parsePositiveInt(process.env.RATE_LIMIT_MAX, defaultGlobalMax());

export const globalLimiter = rateLimit({
  windowMs: globalWindowMs,
  max: globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || isLocalIp(req.ip),
  message: { success: false, message: 'Too many requests — please try again later' },
});

/**
 * Stricter limiter for auth endpoints (login, password reset).
 * 15 attempts per 15-minute window.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts — please try again later' },
});

/**
 * Body-size limit (applies to express.json).
 * 256 KB is generous for JSON APIs; raise if file uploads are ever needed.
 */
export const JSON_BODY_LIMIT = '256kb';
