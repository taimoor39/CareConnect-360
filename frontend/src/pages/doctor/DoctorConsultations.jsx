import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getDoctorSchedule } from '../../api/doctor.js';
import DoctorConsultationModal from '../../components/doctor/DoctorConsultationModal.jsx';
import DoctorLayout from '../../components/doctor/DoctorLayout.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { formatDateInPakistan } from '../../utils/isoDate.js';

function DoctorConsultations() {
  const auth = getAuthUser();
  const [appointments, setAppointments] = useState([]);
  const [active, setActive] = useState(null);

  const fetchData = async () => {
    try {
      const res = await getDoctorSchedule();
      setAppointments(res.data?.data || []);
    } catch {
      toast.error('Failed to load consultations');
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.id]);

  return (
    <>
      <DoctorLayout title="Consultations" doctorName={auth.name}>
        <section className="glass-panel rounded-2xl p-4">
          <h2 className="text-base font-semibold text-white">Consultation Queue</h2>
          <div className="mt-3 space-y-2">
            {appointments.map((a) => (
              <article key={a._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-sm text-slate-100">{formatDateInPakistan(a.date)} {a.timeSlot} - {a.patientId?.name}</p>
                <button type="button" onClick={() => setActive(a)} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-1.5 text-xs text-teal-100">
                  {a.status === 'Completed' ? 'View Notes' : 'Open Consultation'}
                </button>
              </article>
            ))}
          </div>
        </section>
      </DoctorLayout>

      <DoctorConsultationModal
        open={Boolean(active)}
        appointment={active}
        doctorName={auth.name}
        readOnly={active?.status === 'Completed'}
        onClose={() => setActive(null)}
        onSaved={fetchData}
      />
    </>
  );
}

export default DoctorConsultations;

