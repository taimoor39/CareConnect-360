import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { verifyEmailApi } from '../api/auth.js';
import { AuthFormSurface, AuthSplitLayout } from '@/shared/components/auth/AuthSplitLayout.jsx';

function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return undefined;
    }
    (async () => {
      try {
        const { ok, body } = await verifyEmailApi(token);
        if (cancelled) return;
        if (ok) {
          setStatus('ok');
          setMessage(body?.message || 'Email verified successfully.');
        } else {
          setStatus('error');
          setMessage(body?.message || 'Verification failed.');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Could not reach the server. Try again later.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthSplitLayout subtitle="Email verification">
      <AuthFormSurface
        eyebrow="CareConnect 360"
        title="Verify your email"
        subtitle="Confirming your account email address."
      >
        <div className="mt-7 flex flex-col items-center text-center">
          {status === 'loading' ? (
            <>
              <span
                className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/40 border-t-teal-400"
                aria-hidden
              />
              <p className="mt-5 text-[13px] leading-relaxed text-slate-400">Verifying your email…</p>
            </>
          ) : null}

          {status !== 'loading' ? (
            <p
              className={`text-[13px] leading-relaxed ${status === 'ok' ? 'text-teal-200' : 'text-rose-200'}`}
            >
              {message}
            </p>
          ) : null}

          {status !== 'loading' ? (
            <Link
              to="/login"
              className="mt-8 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-teal-500/35 bg-teal-500/[0.06] px-4 py-3 text-sm font-semibold text-teal-100 transition hover:bg-teal-500/10"
            >
              Back to sign in
            </Link>
          ) : null}
        </div>
      </AuthFormSurface>
    </AuthSplitLayout>
  );
}

export default VerifyEmail;
