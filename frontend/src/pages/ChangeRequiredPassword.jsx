import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { changeRequiredPassword } from '../api/auth.js';
import {
  AuthFormSurface,
  AuthSplitLayout,
  authFieldLabelClass,
} from '@/shared/components/auth/AuthSplitLayout.jsx';
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
      const res = await changeRequiredPassword({ newPassword, confirmPassword });
      const token = res.data?.token;
      const serverUser = res.data?.user;
      if (token) {
        localStorage.setItem('careconnect360_token', token);
        localStorage.setItem('token', token);
      }
      let prev = {};
      try {
        prev = JSON.parse(localStorage.getItem('user') || '{}');
      } catch {
        prev = {};
      }
      const u = { ...(serverUser || prev), requirePasswordChange: false };
      localStorage.setItem('user', JSON.stringify(u));
      const role = u.role || 'admin';
      toast.success('Password updated');
      navigate(roleRedirectMap[role] || '/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Update failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout variant="login">
      <AuthFormSurface
        eyebrow="Password update required"
        title="Set a new password"
        subtitle="Your administrator issued a temporary password. Choose a strong replacement to unlock your workspace."
      >
        <form className="mt-7 space-y-5" onSubmit={submit}>
          <div>
            <label className={authFieldLabelClass} htmlFor="cr-pw1">
              New password
            </label>
            <PasswordInput
              id="cr-pw1"
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
            <label className={authFieldLabelClass} htmlFor="cr-pw2">
              Confirm password
            </label>
            <PasswordInput
              id="cr-pw2"
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
            className="flex w-full items-center justify-center rounded-xl bg-[var(--teal)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Continue to workspace'}
          </button>
        </form>
      </AuthFormSurface>
    </AuthSplitLayout>
  );
}

export default ChangeRequiredPassword;
