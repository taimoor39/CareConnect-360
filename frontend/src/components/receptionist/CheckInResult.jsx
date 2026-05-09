function formatPatientId(patient) {
  return patient?.patientId || patient?.patientCode || '—';
}

function CheckInResult({ result, onDismiss }) {
  if (!result) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 px-6 text-center">
        <p className="text-sm font-semibold text-white">Awaiting check-in</p>
        <p className="mt-1 max-w-[18rem] text-xs text-slate-400">
          Scan a QR from the camera, drop in an image, or paste a 24-character appointment ID. Patient details will appear here.
        </p>
      </div>
    );
  }

  if (result.ok) {
    const appt = result.appointment || {};
    const patient = appt.patientId || {};
    const doctor = appt.doctorId || {};
    return (
      <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-emerald-200">Checked in successfully</p>
        <p className="mt-2 text-base font-semibold text-white">{patient.name || 'Patient'}</p>
        <p className="text-xs text-slate-300">ID: {formatPatientId(patient)}</p>

        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[0.625rem] uppercase tracking-[0.12em] text-slate-400">Doctor</dt>
            <dd className="text-slate-100">Dr. {doctor.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-[0.625rem] uppercase tracking-[0.12em] text-slate-400">Time slot</dt>
            <dd className="text-slate-100">{appt.timeSlot || '—'}</dd>
          </div>
          <div>
            <dt className="text-[0.625rem] uppercase tracking-[0.12em] text-slate-400">Contact</dt>
            <dd className="truncate text-slate-100">{patient.phone || patient.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-[0.625rem] uppercase tracking-[0.12em] text-slate-400">Status</dt>
            <dd className="text-slate-100">{appt.status || 'Checked-In'}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-teal-400/20"
        >
          Scan next patient
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-rose-200">Check-in failed</p>
      <p className="mt-2 text-sm text-rose-100">{result.message || 'Something went wrong while checking in.'}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
      >
        Try again
      </button>
    </div>
  );
}

export default CheckInResult;
