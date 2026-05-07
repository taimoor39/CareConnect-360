const freqOptions = ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Other'];

const emptyMedicine = { medicineName: '', dosage: '', frequency: 'Once daily', duration: '', instructions: '' };

function PrescriptionForm({ medicines, setMedicines, onSave, saving = false }) {
  const isRowValid = (m) => m.medicineName.trim().length >= 2 && m.dosage.trim() && m.frequency && m.duration.trim();
  const canSave = medicines.length > 0 && medicines.every(isRowValid);

  const setRow = (idx, patch) => {
    setMedicines((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white">Digital Prescription</h3>
      <div className="space-y-2">
        {medicines.map((m, idx) => (
          <div key={idx} className="grid gap-2 rounded-xl border border-slate-800 p-3 md:grid-cols-6">
            <input value={m.medicineName} onBlur={() => {}} onChange={(e) => setRow(idx, { medicineName: e.target.value })} placeholder="Medicine Name *" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs md:col-span-2" />
            <input value={m.dosage} onBlur={() => {}} onChange={(e) => setRow(idx, { dosage: e.target.value })} placeholder="Dosage *" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
            <select value={m.frequency} onChange={(e) => setRow(idx, { frequency: e.target.value })} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">
              {freqOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
            <input value={m.duration} onBlur={() => {}} onChange={(e) => setRow(idx, { duration: e.target.value })} placeholder="Duration *" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
            <div className="flex items-center gap-2">
              <input value={m.instructions} onChange={(e) => setRow(idx, { instructions: e.target.value })} placeholder="Instructions" className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
              {medicines.length > 1 ? <button type="button" onClick={() => setMedicines((prev) => prev.filter((_, i) => i !== idx))} className="text-rose-300">×</button> : null}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setMedicines((prev) => [...prev, { ...emptyMedicine }])} className="rounded-md border border-slate-700 px-3 py-2 text-xs">+ Add Medicine</button>
      <div>
        <button type="button" disabled={!canSave || saving} onClick={onSave} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100 disabled:opacity-50">Save Prescription</button>
      </div>
    </div>
  );
}

export default PrescriptionForm;

