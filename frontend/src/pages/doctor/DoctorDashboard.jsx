import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getDoctorDashboardStats, getDoctorReports, getDoctorSchedule } from '../../api/doctor.js';
import DoctorConsultationModal from '../../components/doctor/DoctorConsultationModal.jsx';
import DoctorStatCards from '../../components/doctor/DoctorStatCards.jsx';
import DoctorLayout from '@/shared/layouts/DoctorLayout.jsx';
import PendingReportsList from '../../components/doctor/PendingReportsList.jsx';
import TodaySchedule from '../../components/doctor/TodaySchedule.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { formatDateInPakistan, isoDateInPakistan, todayISOInPakistan } from '../../utils/isoDate.js';

function DoctorDashboard() {
  const auth = getAuthUser();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({});
  const [pendingReports, setPendingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAppointment, setActiveAppointment] = useState(null);

  const fetchData = async () => {
    if (!auth.id) return;
    try {
      const [scheduleRes, statsRes, reportsRes] = await Promise.all([
        getDoctorSchedule(),
        getDoctorDashboardStats(),
        getDoctorReports(),
      ]);
      const nextAppointments = scheduleRes.data?.data || [];
      setAppointments(nextAppointments);
      const pending = (reportsRes.data?.data || []).filter((r) => r.summaryStatus === 'Pending Approval');
      setPendingReports(pending);
      setStats({
        ...(statsRes.data?.data || {}),
        todaySub: `${nextAppointments.filter((a) => isoDateInPakistan(a.date) === todayISOInPakistan() && a.status === 'Completed').length} completed, ${nextAppointments.filter((a) => isoDateInPakistan(a.date) === todayISOInPakistan() && a.status !== 'Completed').length} remaining`,
        weekSub: `${statsRes.data?.data?.weekCount || 0} scheduled`,
      });
    } catch (error) {
      toast.error('Failed to load doctor dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.id]);

  const todayIso = todayISOInPakistan();
  const todayAppointments = useMemo(
    () => appointments.filter((a) => isoDateInPakistan(a.date) === todayIso),
    [appointments, todayIso]
  );

  const dateLabel = formatDateInPakistan(new Date(), 'en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <DoctorLayout title="My Dashboard" doctorName={auth.name}>
        <DoctorStatCards stats={stats} />
        {loading ? <div className="skeleton h-24 w-full" /> : <TodaySchedule rows={todayAppointments} dateLabel={dateLabel} onOpenConsultation={setActiveAppointment} />}
        <PendingReportsList pendingReports={pendingReports} onReview={() => window.location.assign('/doctor/reports')} />
      </DoctorLayout>

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

export default DoctorDashboard;

