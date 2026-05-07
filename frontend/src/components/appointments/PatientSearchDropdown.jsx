import { useEffect, useRef, useState } from 'react';

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return `${(parts[0] || '').charAt(0)}${(parts[1] || '').charAt(0)}`.toUpperCase() || 'P';
};

function PatientSearchDropdown({ patientSearch, setPatientSearch, results, loading, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const hasQuery = String(patientSearch || '').trim().length >= 2;
  const showResults = isOpen && hasQuery && results.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <p className="text-[11px] font-medium tracking-[0.08em] text-slate-300">PATIENT</p>
      <input
        value={patientSearch}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setPatientSearch(event.target.value);
          setIsOpen(true);
        }}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-100 outline-none transition focus:border-teal-300/70 focus:ring-2 focus:ring-teal-400/20"
        placeholder="Search patient by name or code..."
      />
      {loading ? <p className="mt-1 text-[11px] text-slate-500">Searching...</p> : null}
      {showResults ? (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-slate-700 bg-slate-950/95 shadow-2xl">
          {results.map((patient) => (
            <button
              key={patient._id}
              type="button"
              onClick={() => {
                onSelect(patient);
                setPatientSearch(patient.name || '');
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-3 border-b border-slate-800 px-3 py-2.5 text-left hover:bg-slate-800/60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-100">{getInitials(patient.name)}</div>
              <div>
                <p className="text-xs text-white">{patient.name}</p>
                <p className="font-mono text-[10px] text-slate-400">{patient.patientId || patient.patientCode} | {patient.phone || '--'}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default PatientSearchDropdown;
