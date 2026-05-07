import { useMemo } from 'react';
import DoctorLayout from '../../components/doctor/DoctorLayout.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { formatDateInPakistan, formatTimeInPakistan } from '../../utils/isoDate.js';

function DoctorPrescriptions() {
  const auth = getAuthUser();
  const store = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('careconnect360_doctor_portal_v1') || '{}');
    } catch {
      return {};
    }
  }, []);
  const rows = Object.entries(store.prescriptions || {});

  return (
    <DoctorLayout title="Prescriptions" doctorName={auth.name}>
      <section className="glass-panel overflow-hidden rounded-2xl">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-4 py-3">Appointment</th>
              <th className="px-4 py-3">Medicines</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={3}>No prescriptions yet</td></tr>
            ) : rows.map(([appointmentId, rx]) => (
              <tr key={appointmentId} className="border-b border-slate-800/60">
                <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{appointmentId}</td>
                <td className="px-4 py-3">{(rx.medicines || []).map((m) => `${m.medicineName} (${m.dosage})`).join(', ')}</td>
                <td className="px-4 py-3">{rx.updatedAt ? `${formatDateInPakistan(rx.updatedAt)} ${formatTimeInPakistan(rx.updatedAt)}` : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DoctorLayout>
  );
}

export default DoctorPrescriptions;

