import logo from '@/assets/logo.png';

/* ─── Exported glyphs (consumed by page components) ─────────── */

export function MailGlyph({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16v12H4V6z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldGlyph({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 3v6c0 5-3.5 9.5-8 10.5C7.5 21.5 4 17 4 12V6l8-3z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Internal glyphs ────────────────────────────────────────── */

function CheckGlyph() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── ECG wave (login left panel) ───────────────────────────── */

const ECG_PATH =
  'M0,28 L14,28 L17,24 L20,28 L27,28 L30,30 L33,7 L37,51 L40,28 L49,28 L54,19 L62,28 L115,28 L129,28 L132,24 L135,28 L142,28 L145,30 L148,7 L152,51 L155,28 L164,28 L169,19 L177,28 L230,28';

function EcgWave() {
  return (
    <div className="mt-8">
      <style>{`
        @keyframes cc360ecg { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .cc360ecg { animation: cc360ecg 4.5s linear infinite; }
      `}</style>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
        Live System Status
      </p>
      <div className="relative h-14 overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.02]">
        <div className="cc360ecg absolute left-0 top-0 flex h-full" style={{ width: '200%' }}>
          <svg
            viewBox="0 0 230 56"
            preserveAspectRatio="none"
            className="h-full flex-1"
            aria-hidden
          >
            <path
              d={ECG_PATH}
              stroke="rgba(13,148,136,0.8)"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
          </svg>
          <svg
            viewBox="0 0 230 56"
            preserveAspectRatio="none"
            className="h-full flex-1"
            aria-hidden
          >
            <path
              d={ECG_PATH}
              stroke="rgba(13,148,136,0.8)"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
          </svg>
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg,#070d1a 0%,transparent 16%,transparent 84%,#070d1a 100%)',
          }}
        />
      </div>
    </div>
  );
}

/* ─── Login left panel ───────────────────────────────────────── */

function LoginAside() {
  return (
    <>
      <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/[0.06] px-3.5 py-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-300/90">
          Healthcare CRM Platform
        </span>
      </div>

      <h1 className="text-balance text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-white sm:text-[2.1rem]">
        Smarter care,{' '}
        <span
          style={{
            backgroundImage: 'linear-gradient(90deg,#2dd4bf,#0d9488)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          orchestrated
        </span>{' '}
        in one place.
      </h1>

      <p className="mt-4 max-w-md text-[14px] leading-relaxed text-slate-400">
        Manage patients, appointments, and clinical workflows — with AI-powered report
        simplification built in.
      </p>

      <EcgWave />

      <dl className="mt-8 grid grid-cols-3 divide-x divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {[
          { value: '4', label: 'User Roles' },
          { value: '9', label: 'Admin Modules' },
          { value: 'AI', label: 'Report Engine' },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center py-4">
            <dd className="text-xl font-bold tracking-tight text-white">{value}</dd>
            <dt className="mt-0.5 text-[11px] text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
    </>
  );
}

/* ─── Recovery left panel ────────────────────────────────────── */

const RECOVERY_STEPS = [
  {
    state: 'done',
    title: 'Enter your email',
    desc: 'Provide the email address linked to your account',
  },
  {
    state: 'active',
    title: 'Check your inbox',
    desc: 'A secure reset link will arrive within a few minutes',
  },
  {
    state: 'pending',
    title: 'Set new password',
    desc: 'Click the link and choose a new secure password',
  },
];

function RecoveryAside() {
  return (
    <>
      <p className="mb-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        How it works
      </p>

      <div className="relative">
        {RECOVERY_STEPS.map((step, i) => (
          <div key={step.title} className="relative flex gap-5 pb-8 last:pb-0">
            {i < RECOVERY_STEPS.length - 1 && (
              <div
                className="absolute bottom-0 top-9 w-px border-l border-dashed border-white/[0.1]"
                style={{ left: '15px' }}
              />
            )}

            <div className="shrink-0">
              {step.state === 'done' ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white">
                  <CheckGlyph />
                </div>
              ) : step.state === 'active' ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-teal-500 bg-teal-500/10 text-[13px] font-bold text-teal-300">
                  {i + 1}
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/60 text-[13px] font-semibold text-slate-600">
                  {i + 1}
                </div>
              )}
            </div>

            <div className="pt-0.5">
              <p
                className={`text-[13px] font-semibold ${
                  step.state === 'done'
                    ? 'text-white'
                    : step.state === 'active'
                      ? 'text-slate-200'
                      : 'text-slate-500'
                }`}
              >
                {step.title}
              </p>
              <p
                className={`mt-1 text-[12px] leading-relaxed ${
                  step.state === 'pending' ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <ShieldGlyph className="mt-0.5 h-5 w-5 shrink-0 text-teal-500/70" />
        <p className="text-[12px] leading-relaxed text-slate-400">
          Reset links expire in{' '}
          <span className="font-semibold text-teal-300">1 hour</span> for your security. All
          access attempts are audit-logged.
        </p>
      </div>
    </>
  );
}

/* ─── Exported layout components ─────────────────────────────── */

export function AuthMarketingAside({ variant = 'login' }) {
  return (
    <div className="flex flex-1 flex-col justify-center lg:min-h-[min(100vh-8rem,640px)] lg:max-w-xl lg:pr-4 xl:pr-10">
      <div className="mb-10 flex items-center gap-3">
        <img
          src={logo}
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg object-contain"
          width={36}
          height={36}
        />
        <div>
          <p className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
            CareConnect 360
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-teal-400/80">
            Healthcare CRM
          </p>
        </div>
      </div>

      {variant === 'recovery' ? <RecoveryAside /> : <LoginAside />}
    </div>
  );
}

export function AuthFormSurface({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/98 p-8 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-9 ${className}`}
    >
      {children}
    </div>
  );
}

export function AuthSplitLayout({ variant = 'login', children }) {
  return (
    <main className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)',
          backgroundSize: '52px 52px',
        }}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-8 lg:flex-row lg:items-center lg:gap-16 lg:py-16">
        <AuthMarketingAside variant={variant} />
        <div className="w-full shrink-0 lg:max-w-[420px]">{children}</div>
      </div>
    </main>
  );
}
