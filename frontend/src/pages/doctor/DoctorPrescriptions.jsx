import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getDoctorPrescriptions } from '../../api/doctor.js';
import DoctorLayout from '@/shared/layouts/DoctorLayout.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { formatDateInPakistan, formatTimeInPakistan } from '../../utils/isoDate.js';

function DoctorPrescriptions() {
  const auth = getAuthUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDoctorPrescriptions();
      setRows(res.data?.data || []);
    } catch {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return (
    <DoctorLayout title="Prescriptions" doctorName={auth.name}>
      <section className="glass-panel overflow-hidden rounded-2xl">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Visit</th>
              <th className="px-4 py-3">Medicines</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                  Loading prescriptions…
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                  No prescriptions yet
                </td>
              </tr>
            ) : null}
            {!loading
              ? rows.map((rx) => {
                  const appt = rx.consultationId?.appointmentId;
                  return (
                    <tr key={rx._id} className="border-b border-slate-800/60">
                      <td className="px-4 py-3 text-slate-200">
                        {rx.patientId?.name || '—'}
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                          {rx.patientId?.patientId || rx.patientId?.patientCode || ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {appt?.date ? formatDateInPakistan(appt.date) : '—'}
                        {appt?.timeSlot ? ` · ${appt.timeSlot}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        {(rx.items || [])
                          .map((m) => `${m.medicineName} (${m.dosage})`)
                          .join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        {rx.updatedAt
                          ? `${formatDateInPakistan(rx.updatedAt)} ${formatTimeInPakistan(rx.updatedAt)}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </section>
    </DoctorLayout>
  );
}

export default DoctorPrescriptions;
