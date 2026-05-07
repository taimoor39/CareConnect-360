import { parseLocalDateFromISO, toISOInputValue, todayISOInPakistan } from './isoDate.js';
export const PKT_OFFSET = 5 * 60;

const parseDateForDisplay = (value) => {
  const strict = parseLocalDateFromISO(value);
  if (strict) return strict;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = parseDateForDisplay(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = parseDateForDisplay(dateStr);
  if (!d) return '—';
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi',
  });
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '—';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const formatTimeSlot = (slot) => {
  if (!slot) return '—';
  const [start, end] = slot.split('-');
  return `${formatTime(start)} – ${formatTime(end)}`;
};

export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return '—';
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(dateStr);
};

export const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  const strict = parseLocalDateFromISO(dateStr);
  if (strict) return toISOInputValue(strict);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return toISOInputValue(d);
};

export const todayPKT = () => {
  return todayISOInPakistan();
};
