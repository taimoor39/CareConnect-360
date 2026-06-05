import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import apiClient from '../api/client.js';
import { getValidStoredTokenOrClear } from '../utils/authUser.js';
import {
  AuthFormSurface,
  AuthSplitLayout,
  MailGlyph,
  ShieldGlyph,
  authFieldLabelClass,
} from '@/shared/components/auth/AuthSplitLayout.jsx';
import { formInputTextStyle } from '@/utils/formInputTextStyle.js';
import { PasswordInput } from '@/shared/components/PasswordField.jsx';

/* ─── Role card icons ────────────────────────────────────────── */

function DoctorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <path
        d="M8 3C6.34 3 5 4.34 5 6v6a7 7 0 0014 0V6c0-1.66-1.34-3-3-3H8z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M5 9h2M17 9h2M12 17v3M10 20h4"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReceptionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <path
        d="M2 9h8.5L12 7H22v14H2V9z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M2 9V6a2 2 0 012-2h5l2 3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PatientIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ROLE_CARDS = [
  { id: 'doctor', label: 'Doctor', Icon: DoctorIcon },
  { id: 'receptionist', label: 'Reception', Icon: ReceptionIcon },
  { id: 'patient', label: 'Patient', Icon: PatientIcon },
];

/* ─── Page component ─────────────────────────────────────────── */

function LoginPage() {
  const existingToken = getValidStoredTokenOrClear();
  const existingUser = localStorage.getItem('user');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [roleHint, setRoleHint] = useState(null);

  if (existingToken) {
    let requirePasswordChange = false;
    const redirectMap = {
      admin: '/dashboard',
      doctor: '/doctor/dashboard',
      receptionist: '/receptionist/dashboard',
      patient: '/patient/dashboard',
    };
    let role = 'admin';
    try {
      const u = JSON.parse(existingUser || '{}');
      role = u?.role || role;
      requirePasswordChange = !!u?.requirePasswordChange;
    } catch {
      role = 'admin';
    }
    if (requirePasswordChange) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to={redirectMap[role] || '/dashboard'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    if (!email.trim() || !password.trim()) {
      setError('Please enter a valid email and password.');
      return;
    }
    if (!emailOk) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const token = response.data?.token;
      const user = response.data?.user;
      localStorage.setItem('careconnect360_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user || {}));

      if (user?.requirePasswordChange) {
        navigate('/change-password', { replace: true });
        return;
      }

      const redirectMap = {
        admin: '/dashboard',
        doctor: '/doctor/dashboard',
        receptionist: '/receptionist/dashboard',
        patient: '/patient/dashboard',
      };
      navigate(redirectMap[user?.role] || '/dashboard', { replace: true });
    } catch (requestError) {
      const apiMsg = requestError.response?.data?.message;
      const code = requestError.code || requestError?.cause?.code;
      if (!requestError.response && (code === 'ERR_NETWORK' || code === 'ECONNREFUSED')) {
        setError('Cannot reach the server. Confirm the API is running (e.g. port 8000).');
      } else {
        setError(apiMsg || requestError.message || 'Invalid email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout variant="login">
      <AuthFormSurface>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-400/90">
          Secure access
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Welcome back</h2>
        <p className="mt-1 text-[13px] text-slate-400">Sign in to your workspace.</p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className={authFieldLabelClass} htmlFor="login-email">
              Email
            </label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@clinic.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={formInputTextStyle}
                className="w-full rounded-xl border border-slate-700/90 bg-slate-950/40 px-4 py-3 pr-11 text-sm outline-none transition placeholder:text-slate-500 focus:border-teal-500/45 focus:ring-1 focus:ring-teal-500/20"
              />
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-hidden
              >
                <MailGlyph />
              </span>
            </div>
          </div>

          <div>
            <label className={authFieldLabelClass} htmlFor="login-password">
              Password
            </label>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-[13px] font-medium text-teal-400/95 hover:text-teal-300"
            >
              Forgot your password?
            </Link>
          </div>

          <p className="text-center text-[13px] text-slate-400">
            New patient?{' '}
            <Link className="font-medium text-teal-400 hover:text-teal-300" to="/register">
              Create an account
            </Link>
          </p>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-3 py-2.5 text-[13px] leading-snug text-rose-100">
              <span
                className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/25 text-[11px] font-bold text-rose-200"
                aria-hidden
              >
                !
              </span>
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--teal)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
                Signing in…
              </>
            ) : (
              <>
                <ArrowRightIcon />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Role quick-select */}
        <div className="relative mt-7 flex items-center">
          <div className="flex-1 border-t border-white/[0.07]" />
          <span className="mx-3 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Or sign in as
          </span>
          <div className="flex-1 border-t border-white/[0.07]" />
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2.5">
          {ROLE_CARDS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setRoleHint(roleHint === id ? null : id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-medium transition ${
                roleHint === id
                  ? 'border-teal-500/35 bg-teal-500/[0.08] text-teal-300'
                  : 'border-white/[0.07] bg-white/[0.02] text-slate-400 hover:border-white/[0.13] hover:bg-white/[0.04] hover:text-slate-300'
              }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>

        {/* Security disclaimer */}
        <p className="mt-5 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <ShieldGlyph className="mt-0.5 h-3 w-3 shrink-0 text-teal-500/60" />
          By signing in you agree to the clinic&apos;s data usage policy. All access is monitored
          and audit-logged.
        </p>
      </AuthFormSurface>
    </AuthSplitLayout>
  );
}

export default LoginPage;
