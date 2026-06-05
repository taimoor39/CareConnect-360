const toMins = (t) => {
  const [h, m] = String(t || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
};

export const isOvernightShift = (start, end) => {
  const s = toMins(start);
  const e = toMins(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return e <= s;
};

export const validateShiftTimes = (start, end) => {
  if (!start || !end) {
    return { valid: false, error: 'Both times required' };
  }
  if (start === end) {
    return { valid: false, error: 'Start and end cannot be same' };
  }
  const s = toMins(start);
  const e = toMins(end);
  if (Number.isNaN(s) || Number.isNaN(e)) {
    return { valid: false, error: 'Invalid time format (use HH:MM)' };
  }
  const dur = e > s ? e - s : (1440 - s) + e;
  if (dur < 60) {
    return { valid: false, error: 'Shift must be at least 1 hour' };
  }
  return { valid: true, overnight: e <= s };
};
