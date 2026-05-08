import Sidebar from './Sidebar.jsx';
import StatusBadge from './ui/StatusBadge.jsx';

function MainLayout({
  title,
  subtitle = 'HEALTHCARE CRM AND AUTOMATION',
  subline = '',
  children,
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <div className="grid min-h-screen grid-cols-1 text-sm lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Sidebar />

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/80 bg-white/80 px-4 py-[0.875rem] backdrop-blur-md sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="care-label uppercase tracking-[0.16em]">{subtitle}</p>
                <h1 className="text-fluidMetric font-bold text-slate-900">{title}</h1>
                {subline ? <p className="mt-0.5 care-label">{subline}</p> : null}
              </div>

              <div className="flex min-h-[2.75rem] flex-wrap items-center justify-end gap-2">
                <div className="relative min-w-[16rem] flex-1 sm:min-w-[18rem]">
                  <input
                    type="search"
                    placeholder="Search patient, doctor, invoice..."
                    className="care-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 outline-none ring-0 transition focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]"
                  />
                </div>
                <StatusBadge label="Live" />
              </div>
            </div>
          </header>

          <div className="care-main flex-1 overflow-auto">
            <div className="min-w-full space-y-6 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default MainLayout;
