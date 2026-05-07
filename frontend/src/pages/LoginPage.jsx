import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import apiClient from '../api/client.js';

function LoginPage() {
  const existingToken = localStorage.getItem('careconnect360_token') || localStorage.getItem('token');
  const existingUser = localStorage.getItem('user');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const token = response.data?.token;
      const user = response.data?.user;
      localStorage.setItem('careconnect360_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user || {}));

      if (user?.requirePasswordChange) {
        navigate('/change-password');
        return;
      }

      const redirectMap = {
        admin: '/dashboard',
        doctor: '/doctor/dashboard',
        receptionist: '/receptionist/dashboard',
        patient: '/patient/dashboard',
      };
      navigate(redirectMap[user?.role] || '/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in.');
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
            <h2 className="font-display text-3xl text-white">Sign in</h2>
            <p className="mt-2 text-sm text-slate-300">Access your CareConnect360 workspace.</p>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20" />
              </label>
              <div
                style={{
                  textAlign: 'right',
                  marginTop: 4,
                  marginBottom: 16,
                }}
              >
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 13,
                    color: '#0d9488',
                    textDecoration: 'none',
                  }}
                >
                  Forgot your password?
                </Link>
              </div>
              {error ? <div className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-70">{submitting ? 'Signing in...' : 'Enter Dashboard'}</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
