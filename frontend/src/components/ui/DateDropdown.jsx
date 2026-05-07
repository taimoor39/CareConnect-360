import { useEffect, useMemo, useState } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CURRENT_YEAR = new Date().getFullYear();

function parseParts(iso) {
  if (!iso) return { year: '', month: '', day: '' };
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { year: '', month: '', day: '' };
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function toISO({ year, month, day }) {
  if (!year || !month || !day) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function DateDropdown({
  value = '',
  onChange,
  minDate,
  maxDate,
  yearFrom = 1900,
  yearTo = CURRENT_YEAR + 10,
  placeholder = ['Day', 'Month', 'Year'],
  /** `short` uses Jan–Dec in the month list so selects stay readable next to the native chevron */
  monthFormat = 'long',
  disabled = false,
  className = '',
  selectClass,
}) {
  // Internal parts hold partial selections independently — this is the KEY fix.
  // The parent's `value` only initialises / resets internal state; it does NOT
  // overwrite it on every render, so partial selections are preserved.
  const [parts, setParts] = useState(() => parseParts(value));

  // Sync internal state only when the external value actually changes
  // (e.g. form reset after submit, programmatic clear).
  const lastValue = useMemo(() => value, [value]);
  useEffect(() => {
    setParts(parseParts(lastValue));
  }, [lastValue]);

  const daysInMonth = useMemo(() => {
    if (!parts.year || !parts.month) return 31;
    return new Date(Number(parts.year), Number(parts.month), 0).getDate();
  }, [parts.year, parts.month]);

  const years = useMemo(() => {
    const out = [];
    for (let y = yearTo; y >= yearFrom; y--) out.push(y);
    return out;
  }, [yearFrom, yearTo]);

  const minParts = useMemo(() => parseParts(minDate), [minDate]);
  const maxParts = useMemo(() => parseParts(maxDate), [maxDate]);

  const sel = selectClass ??
    'h-9 min-w-0 w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-950/90 pl-2.5 pr-9 text-xs text-slate-100 outline-none transition focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/25 disabled:opacity-50 [&>option]:bg-slate-900';

  const handleChange = (field, rawVal) => {
    const val = rawVal !== '' ? Number(rawVal) : '';
    const next = { ...parts, [field]: val };

    // Reset day when month/year changes and the current day would be out of range
    if (field === 'month' || field === 'year') {
      const maxD = next.month && next.year
        ? new Date(Number(next.year), Number(next.month), 0).getDate()
        : 31;
      if (next.day && next.day > maxD) next.day = '';
    }

    setParts(next);

    // Only propagate to parent when the date is fully specified (or cleared)
    const iso = toISO(next);
    onChange?.(iso);
  };

  const isYearAllowed = (y) => {
    if (minParts.year && y < minParts.year) return false;
    if (maxParts.year && y > maxParts.year) return false;
    return true;
  };

  const isMonthAllowed = (mo) => {
    if (parts.year && minParts.year && parts.year === minParts.year && minParts.month && mo < minParts.month) return false;
    if (parts.year && maxParts.year && parts.year === maxParts.year && maxParts.month && mo > maxParts.month) return false;
    return true;
  };

  const isDayAllowed = (d) => {
    if (parts.year && parts.month && minParts.year) {
      if (parts.year === minParts.year && parts.month === minParts.month && minParts.day && d < minParts.day) return false;
    }
    if (parts.year && parts.month && maxParts.year) {
      if (parts.year === maxParts.year && parts.month === maxParts.month && maxParts.day && d > maxParts.day) return false;
    }
    return true;
  };

  const monthLabels = monthFormat === 'short' ? MONTHS_SHORT : MONTHS;

  return (
    <div
      className={`grid grid-cols-3 gap-2 ${className}`}
      style={{ gridTemplateColumns: 'minmax(2.85rem, 0.9fr) minmax(4.5rem, 1.35fr) minmax(3.5rem, 0.95fr)' }}
    >
      {/* Day */}
      <select
        value={parts.day || ''}
        onChange={(e) => handleChange('day', e.target.value)}
        disabled={disabled}
        className={sel}
      >
        <option value="">{placeholder[0]}</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d} disabled={!isDayAllowed(d)}>
            {String(d).padStart(2, '0')}
          </option>
        ))}
      </select>

      {/* Month */}
      <select
        value={parts.month || ''}
        onChange={(e) => handleChange('month', e.target.value)}
        disabled={disabled}
        className={sel}
      >
        <option value="">{placeholder[1]}</option>
        {MONTHS.map((_, i) => {
          const mo = i + 1;
          const label = monthLabels[i];
          return (
            <option key={mo} value={mo} disabled={!isMonthAllowed(mo)}>
              {label}
            </option>
          );
        })}
      </select>

      {/* Year */}
      <select
        value={parts.year || ''}
        onChange={(e) => handleChange('year', e.target.value)}
        disabled={disabled}
        className={sel}
      >
        <option value="">{placeholder[2]}</option>
        {years.map((y) => (
          <option key={y} value={y} disabled={!isYearAllowed(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export default DateDropdown;
