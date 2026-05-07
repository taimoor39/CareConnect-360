import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getDoctorSchedule } from '../../api/doctor.js';
import AppointmentDetailDrawer from '../../components/appointments/AppointmentDetailDrawer.jsx';
import DoctorLayout from '../../components/doctor/DoctorLayout.jsx';
import WeeklyCalendar from '../../components/doctor/WeeklyCalendar.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { isoDateInPakistan } from '../../utils/isoDate.js';

function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function DoctorSchedule() {
  const auth = getAuthUser();
  const [appointments, setAppointments] = useState([]);
  const [status, setStatus] = useState('All');
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [viewMode, setViewMode] = useState('calendar');
  const [selected, setSelected] = useState(null);

  const fetchData = async () => {
    try {
      const res = await getDoctorSchedule();
      setAppointments(res.data?.data || []);
    } catch {
      toast.error('Failed to load schedule');
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.id]);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  }), [weekStart]);

  const weeklyRows = useMemo(() => appointments.filter((a) => {
    const d = new Date(a.date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    if (d < weekStart || d > weekEnd) return false;
    if (status !== 'All' && a.status !== status) return false;
    return true;
  }), [appointments, weekStart, status]);

  const grouped = useMemo(() => {
    const map = new Map(weekDates.map((d) => [isoDateInPakistan(d), []]));
    weeklyRows.forEach((row) => {
      const key = isoDateInPakistan(row.date);
      if (map.has(key)) map.get(key).push(row);
    });
    return map;
  }, [weekDates, weeklyRows]);

  const completed = weeklyRows.filter((a) => a.status === 'Completed').length;
  const missed = weeklyRows.filter((a) => a.status === 'Missed').length;
  const completionRate = weeklyRows.length ? Math.round((completed / weeklyRows.length) * 100) : 0;

  return (
    <>
      <DoctorLayout title="My Schedule" doctorName={auth.name}>
        <WeeklyCalendar
          weekStart={weekStart}
          weekDates={weekDates}
          grouped={grouped}
          status={status}
          setStatus={setStatus}
          onPrevWeek={() => setWeekStart((prev) => { const next = new Date(prev); next.setDate(prev.getDate() - 7); return next; })}
          onNextWeek={() => setWeekStart((prev) => { const next = new Date(prev); next.setDate(prev.getDate() + 7); return next; })}
          onToday={() => setWeekStart(mondayOf(new Date()))}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenAppointment={setSelected}
          weeklyRows={weeklyRows}
          stats={{ total: weeklyRows.length, completed, missed, rate: completionRate }}
        />
      </DoctorLayout>

      <AppointmentDetailDrawer open={Boolean(selected)} appointment={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export default DoctorSchedule;

