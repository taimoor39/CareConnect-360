import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { forgotPassword } from '../api/auth.js';

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
    } catch {
      toast.error('Failed to load data');
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
    } catch {
      toast.error('Failed to load data');
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
            {!sent ? (
              <>
                <h2 className="font-display text-3xl text-white">Reset Your Password</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Enter your registered email address and we will send you a reset link.
                </p>
                <form className="mt-6 space-y-5" onSubmit={submit}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-200">Email Address</span>
                    <input
                      type="email"
                      value={email}
                      placeholder="Enter your registered email"
                      onChange={(ev) => setEmail(ev.target.value)}
                      onBlur={() => setEmailError(validateEmail(email))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
                    />
                    {emailError ? <p className="mt-1 text-sm text-rose-300">{emailError}</p> : null}
                  </label>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-70"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                        Sending…
                      </span>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <Link to="/login" className="text-sm text-teal-300 hover:text-teal-200">
                    ← Back to Login
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-4xl" aria-hidden="true">
                  📧
                </p>
                <h2 className="mt-4 font-display text-2xl text-white">Check your email</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  If an account exists for <strong className="text-white">{sentTo}</strong>, a password reset link has been sent.
                </p>
                <p className="mt-2 text-sm text-slate-400">The link expires in 1 hour.</p>
                <p className="mt-2 text-sm text-slate-500">Didn&apos;t receive it? Check your spam folder.</p>
                <div className="mt-8 flex flex-col gap-3">
                  <button
                    type="button"
                    disabled={cooldown > 0 || submitting}
                    onClick={resend}
                    className="w-full rounded-xl border border-teal-400/50 px-4 py-3 text-sm font-semibold text-teal-100 transition hover:bg-teal-500/10 disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
                  </button>
                  <Link to="/login" className="text-sm text-teal-300 hover:text-teal-200">
                    ← Back to Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
