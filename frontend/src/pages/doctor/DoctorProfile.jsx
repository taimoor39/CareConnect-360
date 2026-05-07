import DoctorLayout from '../../components/doctor/DoctorLayout.jsx';
import { getAuthUser } from '../../utils/authUser.js';

function DoctorProfile() {
  const auth = getAuthUser();
  return (
    <DoctorLayout title="My Profile" doctorName={auth.name}>
      <section className="glass-panel rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white">Doctor Profile</h2>
        <p className="mt-2 text-sm text-slate-300">Name: Dr. {auth.name}</p>
        <p className="text-sm text-slate-400">Role: Doctor</p>
        <p className="mt-3 text-xs text-slate-500">Schedule is shown in My Schedule. Advanced profile editing can be connected to doctor profile APIs when doctor-role endpoints are exposed.</p>
      </section>
    </DoctorLayout>
  );
}

export default DoctorProfile;

