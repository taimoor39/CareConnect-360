import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { resetPassword, verifyResetToken } from '../api/auth.js';
import { AuthFormSurface, AuthSplitLayout } from '@/shared/components/auth/AuthSplitLayout.jsx';
import { PasswordInput } from '@/shared/components/PasswordField.jsx';

const getStrength = (password) => {
  const value = String(password || '');
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;

  if (score <= 2) return { label: 'Weak', width: '33%', color: 'bg-rose-400' };
  if (score === 3) return { label: 'Fair', width: '66%', color: 'bg-amber-400' };
  return { label: 'Strong', width: '100%', color: 'bg-emerald-400' };
};

function AlertGlyph({ className = 'mx-auto h-12 w-12 text-rose-400/90' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} opacity={0.35} />
      <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  );
}

function SuccessGlyph({ className = 'mx-auto h-12 w-12 text-teal-400' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} opacity={0.35} />
      <path d="M8.5 12.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => getStrength(newPassword), [newPassword]);
  const hasMin = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNum = /\d/.test(newPassword);
  const match = confirmPassword.length > 0 && newPassword === confirmPassword;
  const nomatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = hasMin && hasUpper && hasNum && match;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
        setPhase('invalid');
        return;
      }
      try {
        await verifyResetToken(token);
        if (!cancelled) setPhase('form');
      } catch {
        if (!cancelled) setPhase('invalid');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => navigate('/login', { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [done, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !token) return;
    setSubmitting(true);
    try {
      await resetPassword(token, { newPassword, confirmPassword });
      setDone(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to reset password';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout variant="recovery">
      <AuthFormSurface>
        {phase === 'loading' ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/40 border-t-teal-400" aria-hidden />
            <p className="mt-6 text-[13px] text-slate-400">Verifying your reset link…</p>
          </div>
        ) : null}

        {phase === 'invalid' ? (
          <div className="text-center">
            <AlertGlyph />
            <h2 className="mt-5 text-xl font-semibold text-white">Link invalid or expired</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-400">
              Reset links expire after one hour and can only be used once. Request a new email to continue.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                to="/forgot-password"
                className="flex w-full items-center justify-center rounded-xl bg-[var(--teal)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-teal-600"
              >
                Request new link
              </Link>
              <Link to="/login" className="text-[13px] font-medium text-teal-400 hover:text-teal-300">
                ← Back to sign in
              </Link>
            </div>
          </div>
        ) : null}

        {phase === 'form' && !done ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-400/90">New credentials</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Choose a new password</h2>
            <p className="mt-1 text-[13px] text-slate-400">Use a strong password you don&apos;t reuse elsewhere.</p>
            <form className="mt-8 space-y-5" onSubmit={submit}>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-400" htmlFor="reset-pw1">
                  New password
                </label>
                <PasswordInput
                  id="reset-pw1"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <div className="mt-2 h-1.5 rounded bg-slate-800">
                  <div className={`h-full rounded ${strength.color}`} style={{ width: strength.width }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{strength.label}</p>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
                  <li className={hasMin ? 'text-emerald-400/90' : ''}>At least 8 characters</li>
                  <li className={hasUpper ? 'text-emerald-400/90' : ''}>At least 1 uppercase letter</li>
                  <li className={hasNum ? 'text-emerald-400/90' : ''}>At least 1 number</li>
                </ul>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-400" htmlFor="reset-pw2">
                  Confirm password
                </label>
                <PasswordInput
                  id="reset-pw2"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {match ? <p className="mt-1.5 text-[13px] text-emerald-400/90">Passwords match</p> : null}
                {nomatch ? <p className="mt-1.5 text-[13px] text-rose-300">Passwords do not match</p> : null}
              </div>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--teal)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                    Saving…
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </form>
            <p className="mt-6 text-center text-[13px] text-slate-500">
              <Link to="/login" className="font-medium text-teal-400 hover:text-teal-300">
                ← Back to sign in
              </Link>
            </p>
          </>
        ) : null}

        {done ? (
          <div className="text-center">
            <SuccessGlyph />
            <h2 className="mt-5 text-xl font-semibold text-white">Password updated</h2>
            <p className="mt-3 text-[13px] text-slate-400">You can sign in with your new password.</p>
            <p className="mt-2 text-[12px] text-slate-500">Redirecting to sign in in a few seconds…</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="mt-8 w-full rounded-xl bg-[var(--teal)] px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Sign in now
            </button>
          </div>
        ) : null}
      </AuthFormSurface>
    </AuthSplitLayout>
  );
}

export default ResetPassword;
