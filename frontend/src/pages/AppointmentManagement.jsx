import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  createAppointment,
  getAppointmentById,
  getAppointments,
  getAppointmentStats,
  getDoctorAvailability,
  searchPatients,
  updateAppointmentStatus,
} from '../api/appointments.js';
import { getDoctors } from '../api/doctors.js';
import DashboardLayout from '@/shared/layouts/DashboardLayout.jsx';
import AppointmentDetailDrawer from '../components/appointments/AppointmentDetailDrawer.jsx';
import AppointmentFilters from '../components/appointments/AppointmentFilters.jsx';
import AppointmentStatCards from '../components/appointments/AppointmentStatCards.jsx';
import AppointmentTable from '../components/appointments/AppointmentTable.jsx';
import BookAppointmentModal from '../components/appointments/BookAppointmentModal.jsx';
import CancelDialog from '../components/appointments/CancelDialog.jsx';
import QRSuccessModal from '../components/appointments/QRSuccessModal.jsx';
import RescheduleModal from '../components/appointments/RescheduleModal.jsx';
import { parseLocalDateFromISO, toISOInputValue, todayISOInPakistan } from '../utils/isoDate.js';

/** List filters derived from URL. No `date` query = all dates (backend sends full paginated list). */
function filtersFromSearchParams(sp) {
  const rawDate = sp.get('date');
  let date = '';
  if (rawDate === 'today') date = todayISOInPakistan();
  else if (rawDate && parseLocalDateFromISO(rawDate)) date = toISOInputValue(parseLocalDateFromISO(rawDate));
  return {
    date,
    doctorId: sp.get('doctorId') || '',
    status: sp.get('status') || '',
  };
}

function AppointmentManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem('careconnect360_token');

  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [qrSuccessModal, setQrSuccessModal] = useState(false);
  const [newApptData, setNewApptData] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState(() => {
    const fromUrl = filtersFromSearchParams(searchParams);
    return {
      ...fromUrl,
      date: fromUrl.date || todayISOInPakistan(),
      search: '',
      page: 1,
      limit: 10,
    };
  });
  const [searchInput, setSearchInput] = useState('');
  const [bookForm, setBookForm] = useState({
    selectedPatient: null,
    selectedDoctor: null,
    selectedDate: '',
    selectedSlot: '',
    reasonForVisit: '',
    notes: '',
  });
  const [bookErrors, setBookErrors] = useState({});
  const [bookSaving, setBookSaving] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [activeDoctors, setActiveDoctors] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);
  const [targetForCancel, setTargetForCancel] = useState(null);
  const [targetForReschedule, setTargetForReschedule] = useState(null);

  const fetchStats = useCallback(async () => {
    const response = await getAppointmentStats();
    setStats(response.data?.data || {});
  }, []);

  const fetchAppointments = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
        sortBy: 'date',
        sortOrder: 'desc',
        ...(filters.date ? { date: filters.date } : {}),
        ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search ? { search: filters.search } : {}),
      };
      const response = await getAppointments(params);
      setAppointments(response.data?.data?.appointments || []);
      setPagination(response.data?.data?.pagination || { total: 0, page: 1, pages: 1, limit: 10 });
    } catch (error) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [filters]);

  const fetchDoctors = useCallback(async () => {
    try {
      const response = await getDoctors({ status: 'active', page: 1, limit: 200 });
      setActiveDoctors(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load appointments');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchAppointments(), fetchStats()]);
  }, [fetchAppointments, fetchStats]);

  useEffect(() => {
    Promise.all([refreshAll(), fetchDoctors()]).catch(() => toast.error('Failed to load appointments'));
  }, [refreshAll, fetchDoctors]);

  useEffect(() => {
    const fromUrl = filtersFromSearchParams(searchParams);
    setFilters((prev) => {
      if (prev.date === fromUrl.date && prev.doctorId === fromUrl.doctorId && prev.status === fromUrl.status) {
        return prev;
      }
      return { ...prev, ...fromUrl, page: 1 };
    });
  }, [searchParams]);

  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId');
    if (!appointmentId) return;
    let active = true;
    const run = async () => {
      try {
        setDrawerOpen(true);
        setSelectedAppt(null);
        const response = await getAppointmentById(appointmentId);
        if (!active) return;
        setSelectedAppt(response.data?.data || null);
        const next = new URLSearchParams(searchParams);
        next.delete('appointmentId');
        setSearchParams(next, { replace: true });
      } catch (error) {
        if (active) {
          setDrawerOpen(false);
          toast.error('Failed to load appointments');
        }
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (loading) return;
    fetchAppointments();
  }, [filters.date, filters.doctorId, filters.status, filters.search, filters.page, filters.limit]);

  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setPatientLoading(true);
        const response = await searchPatients(patientSearch);
        setPatientResults(response.data?.data?.patients || []);
      } catch (error) {
        setPatientResults([]);
      } finally {
        setPatientLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const fetchAvailability = useCallback(async (doctorId, date) => {
    try {
      setSlotsLoading(true);
      const response = await getDoctorAvailability(doctorId, date);
      setAvailableSlots(response.data?.data?.availableSlots || []);
    } catch (error) {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  const openDrawer = async (appointment) => {
    setDrawerOpen(true);
    setSelectedAppt(null);
    try {
      const response = await getAppointmentById(appointment._id);
      setSelectedAppt(response.data?.data || null);
    } catch (error) {
      setDrawerOpen(false);
      toast.error('Failed to load appointments');
    }
  };

  const runStatus = async (appointment, status) => {
    try {
      await updateAppointmentStatus(appointment._id, { status });
      if (status === 'Completed') toast.success('Appointment completed');
      else if (status === 'Checked-In') toast.success('Patient checked in successfully');
      else toast.success('Appointment updated successfully');
      await refreshAll();
      if (selectedAppt?._id === appointment._id) {
        const refreshed = await getAppointmentById(appointment._id);
        setSelectedAppt(refreshed.data?.data || null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Server error — please try again');
    }
  };

  const validateBook = () => {
    const next = {};
    if (!bookForm.selectedPatient) next.patient = 'Please select a patient';
    if (!bookForm.selectedDoctor) next.doctor = 'Please select a doctor';
    if (!bookForm.selectedDate) next.date = 'Please select a date';
    const today = parseLocalDateFromISO(todayISOInPakistan());
    const selectedDate = parseLocalDateFromISO(bookForm.selectedDate);
    if (!selectedDate) {
      next.date = 'Please select a valid date';
    } else {
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate < today) next.date = 'Cannot book past appointments';
    }
    const day = selectedDate
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][selectedDate.getDay()]
      : '';
    if (selectedDate && bookForm.selectedDoctor?.profile?.schedule?.days?.length > 0 && !bookForm.selectedDoctor.profile.schedule.days.includes(day)) {
      next.date = 'Doctor not available on this day';
    }
    if (!bookForm.selectedSlot) next.slot = 'Please select a time slot';
    setBookErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitBook = async () => {
    if (!validateBook()) return;
    try {
      setBookSaving(true);
      const response = await createAppointment({
        patientId: bookForm.selectedPatient._id,
        doctorId: bookForm.selectedDoctor._id,
        date: bookForm.selectedDate,
        timeSlot: bookForm.selectedSlot,
        reasonForVisit: bookForm.reasonForVisit,
        notes: bookForm.notes,
        ...(targetForReschedule ? { rescheduledFrom: targetForReschedule._id } : {}),
      });
      setBookModalOpen(false);
      setRescheduleModal(false);
      setBookForm({ selectedPatient: null, selectedDoctor: null, selectedDate: '', selectedSlot: '', reasonForVisit: '', notes: '' });
      setNewApptData(response.data?.data || null);
      setQrSuccessModal(true);
      toast.success(targetForReschedule ? 'Appointment rescheduled' : 'Appointment booked successfully');
      await refreshAll();
      setTargetForReschedule(null);
    } catch (error) {
      const message = error.response?.data?.message || '';
      if (error.response?.status === 409 && /time slot/i.test(message)) {
        setBookErrors((prev) => ({ ...prev, slot: 'This slot is already booked' }));
        if (bookForm.selectedDoctor && bookForm.selectedDate) {
          await fetchAvailability(bookForm.selectedDoctor._id, bookForm.selectedDate);
        }
      } else if (error.response?.status === 409 && /patient already/i.test(message)) {
        setBookErrors((prev) => ({ ...prev, patient: 'Patient has appointment today' }));
      } else {
        toast.error('Server error — please try again');
      }
    } finally {
      setBookSaving(false);
    }
  };

  const openCancel = (appointment) => {
    setTargetForCancel(appointment);
    setCancelReason('');
    setCancelDialog(true);
  };

  const confirmCancel = async () => {
    if (!targetForCancel || cancelReason.trim().length < 10) return;
    try {
      setCancelSaving(true);
      await updateAppointmentStatus(targetForCancel._id, { status: 'Cancelled', cancellationReason: cancelReason.trim() });
      setCancelDialog(false);
      setTargetForCancel(null);
      toast.warning('Appointment cancelled');
      await refreshAll();
    } catch (error) {
      toast.error('Server error — please try again');
    } finally {
      setCancelSaving(false);
    }
  };

  const openReschedule = (appointment) => {
    setTargetForReschedule(appointment);
    setBookForm((prev) => ({
      ...prev,
      selectedPatient: appointment.patientId || null,
      selectedDoctor: appointment.doctorId || null,
      selectedDate: '',
      selectedSlot: '',
      reasonForVisit: '',
      notes: '',
    }));
    setRescheduleModal(true);
  };

  const downloadQR = (appointment) => {
    if (!appointment?.qrCodeImage) return;
    const link = document.createElement('a');
    link.download = `appointment-${appointment._id}.png`;
    link.href = appointment.qrCodeImage;
    link.click();
  };

  if (!token) return <Navigate to="/login" replace />;

  return (
    <>
      <DashboardLayout title="Appointment Scheduling">
        <AppointmentStatCards stats={stats} />
        <AppointmentFilters
          filters={filters}
          setFilters={setFilters}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          activeDoctors={activeDoctors}
          onOpenBook={() => {
            setTargetForReschedule(null);
            setBookModalOpen(true);
          }}
        />
        <AppointmentTable
          appointments={appointments}
          loading={loading}
          tableLoading={tableLoading}
          pagination={pagination}
          filters={filters}
          setFilters={setFilters}
          onRefresh={refreshAll}
          onRowClick={openDrawer}
          onStatus={runStatus}
          onCancel={openCancel}
          onReschedule={openReschedule}
        />
      </DashboardLayout>

      <AppointmentDetailDrawer
        open={drawerOpen}
        appointment={selectedAppt}
        onClose={() => setDrawerOpen(false)}
        onDownloadQr={downloadQR}
        renderActions={(appointment) => (
          <div className="flex flex-wrap gap-2">
            {appointment.status === 'Scheduled' ? <button type="button" onClick={() => runStatus(appointment, 'Checked-In')} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-2.5 py-1 text-[11px] text-teal-100">Check In</button> : null}
            {appointment.status === 'Checked-In' ? <button type="button" onClick={() => runStatus(appointment, 'In-Progress')} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100">Start</button> : null}
            {appointment.status === 'In-Progress' ? <button type="button" onClick={() => runStatus(appointment, 'Completed')} className="rounded-md border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100">Complete</button> : null}
            {appointment.status === 'Missed' ? <button type="button" onClick={() => openReschedule(appointment)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100">Reschedule</button> : null}
            {appointment.status === 'Scheduled' ? <button type="button" onClick={() => openCancel(appointment)} className="rounded-md border border-rose-300/30 px-2.5 py-1 text-[11px] text-rose-100">Cancel</button> : null}
          </div>
        )}
      />

      <BookAppointmentModal
        open={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        bookForm={bookForm}
        setBookForm={setBookForm}
        activeDoctors={activeDoctors}
        patientSearch={patientSearch}
        setPatientSearch={setPatientSearch}
        patientResults={patientResults}
        patientLoading={patientLoading}
        onSelectPatient={(patient) => setBookForm((prev) => ({ ...prev, selectedPatient: patient }))}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        errors={bookErrors}
        saving={bookSaving}
        onSubmit={submitBook}
        onFetchAvailability={fetchAvailability}
      />

      <RescheduleModal
        open={rescheduleModal}
        appointment={targetForReschedule}
        onClose={() => setRescheduleModal(false)}
        bookForm={bookForm}
        setBookForm={setBookForm}
        activeDoctors={activeDoctors}
        patientSearch={patientSearch}
        setPatientSearch={setPatientSearch}
        patientResults={patientResults}
        patientLoading={patientLoading}
        onSelectPatient={(patient) => setBookForm((prev) => ({ ...prev, selectedPatient: patient }))}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        errors={bookErrors}
        saving={bookSaving}
        onSubmit={submitBook}
        onFetchAvailability={fetchAvailability}
      />

      <CancelDialog
        open={cancelDialog}
        appointment={targetForCancel}
        reason={cancelReason}
        setReason={setCancelReason}
        saving={cancelSaving}
        onClose={() => setCancelDialog(false)}
        onConfirm={confirmCancel}
      />

      <QRSuccessModal open={qrSuccessModal} appointmentData={newApptData} onClose={() => setQrSuccessModal(false)} />
    </>
  );
}

export default AppointmentManagement;
