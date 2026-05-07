import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { resetPassword, verifyResetToken } from '../api/auth.js';

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

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.24),transparent_32%),radial-gradient(circle_at_90%_5%,rgba(56,189,248,0.21),transparent_35%),linear-gradient(160deg,#020617_0%,#071a2c_48%,#020617_100%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.9fr]">
          <div className="rounded-3xl border border-teal-300/20 bg-slate-900/65 p-8 shadow-glow backdrop-blur-xl sm:p-10">
            <p className="inline-flex rounded-full border border-teal-300/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-teal-100">CARECONNECT360</p>
            <h1 className="mt-5 max-w-xl font-display text-4xl leading-tight text-white sm:text-5xl">Healthcare CRM and Automation</h1>
            <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">Securely manage users, patients, and care operations from one command center.</p>
          </div>

          <div className="glass-panel rounded-3xl border-teal-300/20 p-6 shadow-2xl sm:p-8">
            {phase === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                <p className="mt-6 text-sm text-slate-300">Verifying your reset link…</p>
              </div>
            ) : null}

            {phase === 'invalid' ? (
              <div className="text-center">
                <p className="text-4xl" aria-hidden="true">
                  ❌
                </p>
                <h2 className="mt-4 font-display text-2xl text-white">This link is invalid or has expired</h2>
                <p className="mt-3 text-sm text-slate-400">Password reset links expire after 1 hour. Please request a new one.</p>
                <div className="mt-8 flex flex-col gap-3">
                  <Link
                    to="/forgot-password"
                    className="w-full rounded-xl bg-teal-500 px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-teal-400"
                  >
                    Request New Link
                  </Link>
                  <Link to="/login" className="text-sm text-teal-300 hover:text-teal-200">
                    ← Back to Login
                  </Link>
                </div>
              </div>
            ) : null}

            {phase === 'form' && !done ? (
              <>
                <h2 className="font-display text-3xl text-white">Set New Password</h2>
                <p className="mt-2 text-sm text-slate-300">Choose a strong password for your account.</p>
                <form className="mt-6 space-y-5" onSubmit={submit}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-200">New Password</span>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 pr-12 text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                        onClick={() => setShowPw((s) => !s)}
                      >
                        {showPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="mt-1 h-1.5 rounded bg-slate-800">
                      <div className={`h-full rounded ${strength.color}`} style={{ width: strength.width }} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{strength.label}</p>
                    <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
                      <li className={hasMin ? 'text-emerald-300' : ''}>At least 8 characters</li>
                      <li className={hasUpper ? 'text-emerald-300' : ''}>At least 1 uppercase letter</li>
                      <li className={hasNum ? 'text-emerald-300' : ''}>At least 1 number</li>
                    </ul>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-200">Confirm Password</span>
                    <div className="relative">
                      <input
                        type={showPw2 ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 pr-12 text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                        onClick={() => setShowPw2((s) => !s)}
                      >
                        {showPw2 ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {match ? <p className="mt-1 text-sm text-emerald-300">✓ Passwords match</p> : null}
                    {nomatch ? <p className="mt-1 text-sm text-rose-300">✕ Passwords do not match</p> : null}
                  </label>
                  <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                        Saving…
                      </span>
                    ) : (
                      'Set New Password'
                    )}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <Link to="/login" className="text-sm text-teal-300 hover:text-teal-200">
                    ← Back to Login
                  </Link>
                </div>
              </>
            ) : null}

            {done ? (
              <div className="text-center">
                <p className="text-4xl" aria-hidden="true">
                  ✅
                </p>
                <h2 className="mt-4 font-display text-2xl text-white">Password reset successfully!</h2>
                <p className="mt-3 text-sm text-slate-300">You can now log in with your new password.</p>
                <p className="mt-2 text-sm text-slate-500">Redirecting to login in 3 seconds…</p>
                <button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  className="mt-8 w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-teal-400"
                >
                  Go to Login Now
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default ResetPassword;
