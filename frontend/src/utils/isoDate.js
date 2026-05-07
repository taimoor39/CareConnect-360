const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const PAKISTAN_TIMEZONE = 'Asia/Karachi';

/**
 * Parse a date string in strict YYYY-MM-DD as local calendar date.
 * Returns null if the string is not ISO-shaped or is not a real calendar day.
 */
export function parseLocalDateFromISO(value) {
  const raw = String(value || '').trim();
  const m = raw.match(ISO_DATE);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);

  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (y < 1900 || y > 2100) return null;

  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;

  return dt;
}

/** Format a local Date as YYYY-MM-DD for <input type="date" /> */
export function toISOInputValue(dt) {
  if (!dt || Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/**
 * Normalize any value suitable for a date input to a strict YYYY-MM-DD or ''.
 * Invalid / partial values become '' so React never feeds garbage back into the input.
 */
export function normalizeISODateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // Accept datetime-like inputs from APIs (e.g. 1998-03-12T00:00:00.000Z)
  // while preserving the intended calendar date for date-only UI controls.
  const leadingIsoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (leadingIsoDate?.[1]) {
    const dtFromLeading = parseLocalDateFromISO(leadingIsoDate[1]);
    if (dtFromLeading) return toISOInputValue(dtFromLeading);
  }

  const dt = parseLocalDateFromISO(raw);
  return dt ? toISOInputValue(dt) : '';
}

function partsInTimeZone(date = new Date(), timeZone = PAKISTAN_TIMEZONE) {
  const dt = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dt.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(dt);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  if (!year || !month || !day) return null;
  return { year, month, day };
}

/** Alias for APIs that expect “today” in Asia/Karachi as YYYY-MM-DD. */
export function todayPKT() {
  return todayISOInPakistan();
}

export function todayISOInPakistan() {
  const parts = partsInTimeZone(new Date(), PAKISTAN_TIMEZONE);
  if (!parts) return '';
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

/**
 * Convert any date/time value to YYYY-MM-DD in Pakistan timezone.
 * Useful when backend returns UTC timestamps but UI comparisons are day-based.
 */
export function isoDateInPakistan(dateInput) {
  const parts = partsInTimeZone(dateInput instanceof Date ? dateInput : new Date(dateInput), PAKISTAN_TIMEZONE);
  if (!parts) return '';
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function firstOfMonthISOInPakistan() {
  const todayIso = todayISOInPakistan();
  const dt = parseLocalDateFromISO(todayIso);
  if (!dt) return '';
  dt.setDate(1);
  return toISOInputValue(dt);
}

export function currentYearInPakistan() {
  const parts = partsInTimeZone(new Date(), PAKISTAN_TIMEZONE);
  return Number(parts?.year || new Date().getFullYear());
}

export function formatDateInPakistan(dateInput, locale = 'en-US', options = {}) {
  const dt = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return '--';
  return new Intl.DateTimeFormat(locale, { timeZone: PAKISTAN_TIMEZONE, ...options }).format(dt);
}

export function formatTimeInPakistan(dateInput, locale = 'en-US', options = {}) {
  const dt = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return '--';
  return new Intl.DateTimeFormat(locale, {
    timeZone: PAKISTAN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(dt);
}
