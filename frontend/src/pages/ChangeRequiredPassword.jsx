import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { changeRequiredPassword } from '../api/auth.js';

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

const roleRedirectMap = {
  admin: '/dashboard',
  doctor: '/doctor/dashboard',
  receptionist: '/receptionist/dashboard',
  patient: '/patient/dashboard',
};

function ChangeRequiredPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => getStrength(newPassword), [newPassword]);
  const hasMin = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNum = /\d/.test(newPassword);
  const match = confirmPassword.length > 0 && newPassword === confirmPassword;
  const nomatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = hasMin && hasUpper && hasNum && match;

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (!u.requirePasswordChange) {
        const r = u.role || 'admin';
        navigate(roleRedirectMap[r] || '/dashboard', { replace: true });
      }
    } catch {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await changeRequiredPassword({ newPassword, confirmPassword });
      let role = 'admin';
      try {
        role = JSON.parse(localStorage.getItem('user') || '{}')?.role || role;
      } catch {
        role = 'admin';
      }
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      u.requirePasswordChange = false;
      localStorage.setItem('user', JSON.stringify(u));
      toast.success('Password changed');
      navigate(roleRedirectMap[role] || '/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Update failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.24),transparent_32%),radial-gradient(circle_at_90%_5%,rgba(56,189,248,0.21),transparent_35%),linear-gradient(160deg,#020617_0%,#071a2c_48%,#020617_100%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
        <div className="glass-panel w-full rounded-3xl border-teal-300/20 p-6 shadow-2xl sm:p-8">
          <h1 className="font-display text-2xl text-white">Set Your New Password</h1>
          <p className="mt-2 text-sm text-slate-300">
            Your administrator has set a temporary password. Please choose a new secure password to continue.
          </p>
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
              {submitting ? 'Saving…' : 'Continue →'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default ChangeRequiredPassword;
