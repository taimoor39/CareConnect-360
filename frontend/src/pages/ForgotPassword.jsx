import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { forgotPassword } from '../api/auth.js';
import {
  AuthFormSurface,
  AuthSplitLayout,
  MailGlyph,
  authFieldLabelClass,
} from '@/shared/components/auth/AuthSplitLayout.jsx';

/* ─── Icon glyphs ────────────────────────────────────────────── */

function CheckCircleGlyph({ className = 'mx-auto h-12 w-12 text-teal-400' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} opacity={0.35} />
      <path
        d="M8.5 12.5l2.5 2.5 5-5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M12 7v5l3 3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Page component ─────────────────────────────────────────── */

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const validateEmail = (value) => {
    const v = String(value || '').trim();
    if (!v) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
    return '';
  };

  const submit = async (e) => {
    e?.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSentTo(email.trim());
      setSent(true);
      setCooldown(60);
    } catch (err) {
      const code = err?.code || err?.cause?.code;
      if (!err?.response && (code === 'ERR_NETWORK' || code === 'ECONNREFUSED')) {
        toast.error('Cannot reach the API — start the backend (npm run dev).');
      } else {
        toast.error(err?.response?.data?.message || 'Could not send reset email. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || !sentTo) return;
    setSubmitting(true);
    try {
      await forgotPassword(sentTo);
      setCooldown(60);
      toast.success('If this email exists, a reset link has been sent.');
    } catch (err) {
      const code = err?.code || err?.cause?.code;
      if (!err?.response && (code === 'ERR_NETWORK' || code === 'ECONNREFUSED')) {
        toast.error('Cannot reach the API — start the backend (npm run dev).');
      } else {
        toast.error(err?.response?.data?.message || 'Could not resend — try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout variant="recovery">
      <AuthFormSurface>
        {!sent ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-400/90">
              Account recovery
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Reset your password
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
              We&apos;ll send a secure link to your registered email address.
            </p>

            <form className="mt-7 space-y-5" onSubmit={submit}>
              <div>
                <label className={authFieldLabelClass} htmlFor="forgot-email">
                  Registered email
                </label>
                <div className="relative">
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    placeholder="you@clinic.com"
                    onChange={(ev) => setEmail(ev.target.value)}
                    onBlur={() => setEmailError(validateEmail(email))}
                    className="w-full rounded-xl border border-slate-700/90 bg-slate-950/40 px-4 py-3 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-500/45 focus:ring-1 focus:ring-teal-500/20"
                  />
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-hidden
                  >
                    <MailGlyph />
                  </span>
                </div>
                {emailError ? (
                  <p className="mt-1.5 text-[13px] text-rose-300">{emailError}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--teal)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden
                    />
                    Sending…
                  </>
                ) : (
                  <>
                    <SendIcon />
                    Send Reset Link
                  </>
                )}
              </button>

              <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
                <ClockIcon />
                Link expires in 1 hour
              </p>
            </form>

            <p className="mt-6 flex items-center gap-1.5 text-[13px] text-slate-500">
              <ArrowLeftIcon />
              <Link to="/login" className="font-medium text-teal-400 hover:text-teal-300">
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <CheckCircleGlyph />
            <h2 className="mt-5 text-xl font-semibold text-white">Check your inbox</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-400">
              If an account exists for{' '}
              <span className="font-medium text-slate-200">{sentTo}</span>, a password reset link
              has been sent.
            </p>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
              <ClockIcon />
              Link expires in 1 hour &middot; Check spam or promotions folders.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                disabled={cooldown > 0 || submitting}
                onClick={resend}
                className="w-full rounded-xl border border-teal-500/35 bg-teal-500/[0.06] px-4 py-3 text-[13px] font-semibold text-teal-100 transition hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
                <ArrowLeftIcon />
                <Link to="/login" className="font-medium text-teal-400 hover:text-teal-300">
                  Back to sign in
                </Link>
              </p>
            </div>
          </div>
        )}
      </AuthFormSurface>
    </AuthSplitLayout>
  );
}

export default ForgotPassword;
