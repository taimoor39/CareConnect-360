function CheckInResult({ result, onDismiss }) {
  if (!result) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center text-center text-slate-400">
        <p className="text-5xl" aria-hidden="true">
          📷
        </p>
        <p className="mt-3 text-sm">Scan a QR code to check in a patient</p>
      </div>
    );
  }

  if (result.ok) {
    const name = result.appointment?.patientId?.name || 'Patient';
    return (
      <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
        <p className="text-sm font-semibold text-emerald-200">CHECKED IN SUCCESSFULLY</p>
        <p className="mt-2 text-white">{name}</p>
        <p className="text-xs text-slate-300">
          {result.appointment?.patientId?.patientId || result.appointment?.patientId?.patientCode || '--'}
        </p>
        <p className="mt-2 text-xs text-slate-300">Doctor: Dr. {result.appointment?.doctorId?.name || '--'}</p>
        <p className="text-xs text-slate-300">Time: {result.appointment?.timeSlot || '--'}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-1.5 text-xs text-teal-100"
        >
          Scan next patient
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4">
      <p className="text-sm font-semibold text-rose-200">CHECK-IN FAILED</p>
      <p className="mt-2 text-xs text-slate-200">{result.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100"
      >
        Try again
      </button>
    </div>
  );
}

export default CheckInResult;
