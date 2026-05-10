import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { registerPatientAccount } from '../api/auth.js';
import { getValidStoredTokenOrClear } from '../utils/authUser.js';
import {
  AuthFormSurface,
  AuthSplitLayout,
  ShieldGlyph,
  authFieldLabelClass,
  authTextInputClass,
} from '@/shared/components/auth/AuthSplitLayout.jsx';
import { PasswordInput } from '@/shared/components/PasswordField.jsx';

const loggedInRedirectPath = () => {
  let role = 'admin';
  let requirePasswordChange = false;
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    role = u?.role || role;
    requirePasswordChange = !!u?.requirePasswordChange;
  } catch {
    role = 'admin';
  }
  if (requirePasswordChange) return '/change-password';
  const redirectMap = {
    admin: '/dashboard',
    doctor: '/doctor/dashboard',
    receptionist: '/receptionist/dashboard',
    patient: '/patient/dashboard',
  };
  return redirectMap[role] || '/dashboard';
};

function RegisterPatient() {
  const navigate = useNavigate();
  const token = getValidStoredTokenOrClear();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('other');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (token) {
    return <Navigate to={loggedInRedirectPath()} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must include at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must include at least one number.');
      return;
    }
    setSubmitting(true);
    try {
      await registerPatientAccount({
        firstName,
        lastName,
        email,
        password,
        phone,
        dateOfBirth,
        gender,
      });
      toast.success(
        'Registration received. An administrator must approve your portal access before you can sign in. Check your email if verification is enabled.',
      );
      navigate('/login', { replace: true });
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      const errorLine =
        Array.isArray(apiErrors) && apiErrors.length > 0
          ? apiErrors
              .map((x) => x.message || x.msg)
              .filter(Boolean)
              .join('. ')
          : '';
      const msg =
        err.response?.data?.message || errorLine || err.message || 'Registration failed';
      setError(typeof msg === 'string' ? msg : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = `${authTextInputClass} cursor-pointer`;

  return (
    <AuthSplitLayout subtitle="Patient registration">
      <AuthFormSurface
        eyebrow="CareConnect 360"
        title="Create patient account"
        subtitle="Self-registration creates your login and chart. An administrator must approve portal access before you can use the patient portal."
      >
        <form className="mt-7 space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-fn" className={authFieldLabelClass}>
                First name
              </label>
              <input
                id="reg-fn"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className={authTextInputClass}
              />
            </div>
            <div>
              <label htmlFor="reg-ln" className={authFieldLabelClass}>
                Last name
              </label>
              <input
                id="reg-ln"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className={authTextInputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className={authFieldLabelClass}>
              Email
            </label>
            <input
              id="reg-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={authTextInputClass}
            />
          </div>

          <div>
            <label htmlFor="reg-phone" className={authFieldLabelClass}>
              Phone
            </label>
            <input
              id="reg-phone"
              required
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={authTextInputClass}
            />
          </div>

          <div>
            <label htmlFor="reg-dob" className={authFieldLabelClass}>
              Date of birth
            </label>
            <input
              id="reg-dob"
              required
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={authTextInputClass}
            />
          </div>

          <div>
            <label htmlFor="reg-gender" className={authFieldLabelClass}>
              Gender
            </label>
            <select
              id="reg-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={selectClass}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="reg-password" className={authFieldLabelClass}>
              Password
            </label>
            <PasswordInput
              id="reg-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, uppercase + number"
            />
            <p className="mt-1.5 text-[12px] leading-snug text-slate-500">
              Use at least 8 characters, one uppercase letter, and one number (same rules as sign-in).
            </p>
          </div>

          <div>
            <label htmlFor="reg-password2" className={authFieldLabelClass}>
              Confirm password
            </label>
            <PasswordInput
              id="reg-password2"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
            />
          </div>

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
                Creating account…
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-slate-400">
          Already have an account?{' '}
          <Link className="font-medium text-teal-400 hover:text-teal-300" to="/login">
            Sign in
          </Link>
        </p>

        <p className="mt-5 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <ShieldGlyph className="mt-0.5 h-3 w-3 shrink-0 text-teal-500/60" />
          Staff accounts are created by your clinic administrator. This page is for patient self-registration only.
        </p>
      </AuthFormSurface>
    </AuthSplitLayout>
  );
}

export default RegisterPatient;
