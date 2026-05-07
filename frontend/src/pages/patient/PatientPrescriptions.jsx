import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getPublicSettings } from '../../api/settings.js';
import { getMyPrescriptions } from '../../api/patientPortal.js';
import PatientPaginationBar from '../../components/patient/PatientPaginationBar.jsx';
import { formatDate } from '../../utils/dateHelpers.js';
import { generatePrescriptionPDF } from '../../utils/generatePrescriptionPDF.js';

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function PatientPrescriptions() {
  const [rows, setRows] = useState([]);
  const [clinicName, setClinicName] = useState('CareConnect 360');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, pub] = await Promise.all([
        getMyPrescriptions({ page, limit: 10 }),
        getPublicSettings().catch(() => ({ data: {} })),
      ]);
      setRows(pr.data?.data?.prescriptions || []);
      setPagination(pr.data?.data?.pagination || { total: 0, pages: 1, limit: 10 });
      setClinicName(pub.data?.data?.clinicName || 'CareConnect 360');
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const printPdf = (rx, patientLite) => {
    const apptDate = rx.consultationId?.appointmentId?.date;
    const follow = rx.consultationId?.followUpDate;
    generatePrescriptionPDF({
      patient: patientLite,
      doctor: {
        name: rx.doctorId?.name,
        specialization: rx.doctorProfile?.specialization || rx.doctorId?.specialization,
      },
      prescription: {
        items: rx.items,
        followUpDate: follow ? formatDate(follow) : null,
      },
      appointmentDate: apptDate ? formatDate(apptDate) : formatDate(rx.createdAt),
      clinicName,
    });
    toast.success('PDF downloaded');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {loading ? <p className="text-slate-400">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">No prescriptions yet.</p>
      ) : null}
      {rows.map((rx) => {
        const appt = rx.consultationId?.appointmentId;
        const patientLite = {
          name: rx.patientId?.name,
          patientId: rx.patientId?.patientId,
          patientCode: rx.patientId?.patientCode,
          age: rx.patientId?.dateOfBirth ? calcAge(rx.patientId.dateOfBirth) : null,
        };
        return (
          <article key={rx._id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
            <p className="text-xs text-slate-500">Prescribed: {formatDate(rx.createdAt)}</p>
            <p className="mt-1 text-lg font-semibold text-white">
              Dr. {rx.doctorId?.name || '—'} — {rx.doctorProfile?.specialization || rx.doctorId?.specialization || '—'}
            </p>
            <p className="mt-1 text-sm text-slate-400">Appointment: {appt?.date ? formatDate(appt.date) : '—'}</p>
            <div className="mt-4 border-t border-slate-800/60 pt-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-teal-300/90">Medicines</p>
              <ul className="mt-3 space-y-4">
                {(rx.items || []).map((item, idx) => (
                  <li key={idx} className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 text-sm">
                    <p className="font-medium text-white">
                      {idx + 1}. {item.medicineName}
                    </p>
                    <p className="mt-2 text-slate-400">
                      Dosage: {item.dosage} · Frequency: {item.frequency}
                    </p>
                    <p className="text-slate-400">Duration: {item.duration}</p>
                    {item.instructions ? <p className="mt-1 text-slate-500">Instructions: {item.instructions}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
            {rx.consultationId?.followUpDate ? (
              <p className="mt-4 text-sm text-sky-200/90">Follow-up: {formatDate(rx.consultationId.followUpDate)}</p>
            ) : null}
            <button
              type="button"
              onClick={() => printPdf(rx, patientLite)}
              className="mt-5 rounded-lg border border-teal-400/40 bg-teal-500/10 px-4 py-2 text-xs font-semibold text-teal-100"
            >
              Print / Download PDF
            </button>
          </article>
        );
      })}

      <PatientPaginationBar
        page={pagination.page || page}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={setPage}
      />
    </div>
  );
}

export default PatientPrescriptions;
