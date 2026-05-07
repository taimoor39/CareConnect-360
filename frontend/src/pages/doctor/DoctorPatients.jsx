import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getDoctorPatientDetail, getDoctorPatients, getDoctorSchedule } from '../../api/doctor.js';
import DoctorConsultationModal from '../../components/doctor/DoctorConsultationModal.jsx';
import DoctorPatientDrawer from '../../components/doctor/DoctorPatientDrawer.jsx';
import DoctorLayout from '../../components/doctor/DoctorLayout.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { formatDateInPakistan } from '../../utils/isoDate.js';

function DoctorPatients() {
  const auth = getAuthUser();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selectedPatient, setSelectedPatient] = useState(null); // detail payload
  const [activeAppointment, setActiveAppointment] = useState(null);

  const fetchData = async () => {
    try {
      const [patientsRes, scheduleRes] = await Promise.all([
        getDoctorPatients({ search, status }),
        getDoctorSchedule(),
      ]);
      setPatients(patientsRes.data?.data?.patients || []);
      setAppointments(scheduleRes.data?.data || []);
    } catch {
      toast.error('Failed to load patients');
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.id, search, status]);

  const filtered = useMemo(() => patients.filter((p) => {
    const q = search.toLowerCase();
    const text = `${p.name || ''} ${p.phone || ''} ${p.patientId || p.patientCode || ''}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (status !== 'All' && String(p.status || 'Active') !== status) return false;
    return true;
  }), [patients, search, status]);

  return (
    <>
      <DoctorLayout title="My Patients" doctorName={auth.name}>
        <section className="glass-panel rounded-2xl p-4">
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, patient code" className="min-w-72 flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm">
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </section>

        <section className="glass-panel overflow-hidden rounded-2xl">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Age/Gender</th>
                <th className="px-4 py-3">Last Visit</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const pRows = appointments.filter((a) => String(a.patientId?._id) === String(p._id));
                const lastVisit = [...pRows].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                return (
                  <tr key={p._id} className="border-b border-slate-800/60">
                    <td className="px-4 py-3 text-slate-100">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{p.patientId || p.patientCode || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{p.phone || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{p.age || '-'} / {p.gender || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{lastVisit ? formatDateInPakistan(lastVisit.date) : '--'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await getDoctorPatientDetail(p._id);
                            setSelectedPatient(res.data?.data || null);
                          }}
                          className="rounded-md border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-100"
                        >
                          View History
                        </button>
                        <button type="button" onClick={() => setActiveAppointment(lastVisit || null)} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-2.5 py-1 text-[11px] text-teal-100">New Report</button>
                        <button type="button" onClick={() => setActiveAppointment(lastVisit || null)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100">Prescribe</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </DoctorLayout>

      <DoctorPatientDrawer open={Boolean(selectedPatient)} detail={selectedPatient} onClose={() => setSelectedPatient(null)} />

      <DoctorConsultationModal
        open={Boolean(activeAppointment)}
        appointment={activeAppointment}
        doctorName={auth.name}
        onClose={() => setActiveAppointment(null)}
        onSaved={fetchData}
      />
    </>
  );
}

export default DoctorPatients;

