const PKT_OFFSET = '+05:00';
const PAKISTAN_TIMEZONE = 'Asia/Karachi';
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isISODateOnly = (value) => ISO_DATE_RE.test(String(value || '').trim());

export const toPakistanISODate = (dateInput) => {
  const dt = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PAKISTAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dt);
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';
  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
};

export const dayBoundsInPakistan = (value) => {
  const raw = String(value || '').trim();
  const isoDate = isISODateOnly(raw) ? raw : toPakistanISODate(raw);
  if (!isoDate) return null;
  return {
    start: new Date(`${isoDate}T00:00:00${PKT_OFFSET}`),
    end: new Date(`${isoDate}T23:59:59.999${PKT_OFFSET}`),
    isoDate,
  };
};

export const todayBoundsInPakistan = () => {
  const isoDate = toPakistanISODate(new Date());
  return dayBoundsInPakistan(isoDate);
};

/** Start/end of “today” in Asia/Karachi (for appointment `date` queries). */
export const getTodayRangePKT = () => {
  const bounds = todayBoundsInPakistan();
  if (!bounds) return null;
  return { start: bounds.start, end: bounds.end };
};

