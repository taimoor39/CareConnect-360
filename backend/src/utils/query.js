/**
 * Shared query helpers used across multiple controllers.
 */
import { dayBoundsInPakistan, todayBoundsInPakistan } from './dateTime.js';

// ─── Pagination ───────────────────────────────────────────────────────────
export const parsePagination = (query, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const paginationMeta = (total, page, limit) => ({
  total,
  page,
  pages: Math.ceil(total / limit) || 1,
  limit,
});

// ─── Regex safety ─────────────────────────────────────────────────────────
/**
 * Escapes special regex characters in user-supplied strings,
 * preventing ReDoS when building search patterns.
 */
export const escapeRegex = (str) =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchRegex = (input) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  return new RegExp(escapeRegex(trimmed), 'i');
};

// ─── Date helpers ─────────────────────────────────────────────────────────
export const startEndOfDay = (dateInput) => {
  if (dateInput) {
    const bounds = dayBoundsInPakistan(dateInput);
    if (bounds) return { start: bounds.start, end: bounds.end };
  }
  const today = todayBoundsInPakistan();
  if (today) return { start: today.start, end: today.end };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ─── Name helpers ─────────────────────────────────────────────────────────
export const parseName = (value = '') => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

export const buildFullName = (body) => {
  const first = String(body.firstName || '').trim();
  const last = String(body.lastName || '').trim();
  return String(body.name || `${first} ${last}`).trim();
};
