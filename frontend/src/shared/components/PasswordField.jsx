import { forwardRef, useState } from 'react';
import { formInputTextStyle } from '@/utils/formInputTextStyle.js';

/** Heroicons-style outline — tuned for 18–20px display */
export function IconEye({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function IconEyeSlash({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.88 9.88a3 3 0 104.24 4.24"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.73 5.08A10.3 10.3 0 0 1 12 5c7 0 10 7 10 7a13.24 13.24 0 0 1-1.67 2.68"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.61 6.61A13.33 13.33 0 0 1 2 12s4 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function PasswordRevealButton({ visible, onToggle, className = '', disabled = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 outline-none transition hover:bg-white/[0.06] hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:pointer-events-none disabled:opacity-40 ${className}`}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
    >
      {visible ? <IconEyeSlash size={18} /> : <IconEye size={18} />}
    </button>
  );
}

/**
 * Controlled password field with visibility toggle. Forwards ref to the input.
 * @param {'sm'|'md'} size
 */
export const PasswordInput = forwardRef(function PasswordInput(
  { className = '', inputClassName = '', size = 'md', disabled, style, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const pad =
    size === 'sm'
      ? 'min-h-[2.25rem] px-3 py-2 pr-10 text-xs rounded-lg'
      : size === 'compact'
        ? 'h-10 px-3 py-2 pr-10 text-sm rounded-lg'
        : 'px-4 py-3 pr-11 text-sm rounded-xl';

  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        {...props}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        style={{ ...formInputTextStyle, ...style }}
        className={`w-full border border-slate-700/90 bg-slate-950/40 outline-none transition placeholder:text-slate-500 focus:border-teal-500/45 focus:ring-1 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${pad} ${inputClassName}`}
      />
      <PasswordRevealButton visible={visible} onToggle={() => setVisible((v) => !v)} disabled={disabled} />
    </div>
  );
});
