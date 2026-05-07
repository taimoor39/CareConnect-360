import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { createAppointment, getAppointmentById, getAppointments, getAppointmentStats, getDoctorAvailability, searchPatients, updateAppointmentStatus } from '../../api/appointments.js';
import { getDoctors } from '../../api/doctors.js';
import AppointmentDetailDrawer from '../../components/appointments/AppointmentDetailDrawer.jsx';
import AppointmentFilters from '../../components/appointments/AppointmentFilters.jsx';
import AppointmentStatCards from '../../components/appointments/AppointmentStatCards.jsx';
import AppointmentTable from '../../components/appointments/AppointmentTable.jsx';
import BookAppointmentModal from '../../components/appointments/BookAppointmentModal.jsx';
import CancelDialog from '../../components/appointments/CancelDialog.jsx';
import RescheduleModal from '../../components/appointments/RescheduleModal.jsx';
import ReceptionistLayout from '../../components/receptionist/ReceptionistLayout.jsx';
import { todayISOInPakistan } from '../../utils/isoDate.js';

function ReceptionistAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ date: todayISOInPakistan(), doctorId: '', status: '', search: '', page: 1, limit: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [bookForm, setBookForm] = useState({ selectedPatient: null, selectedDoctor: null, selectedDate: todayISOInPakistan(), selectedSlot: '', reasonForVisit: '', notes: '' });
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
      const response = await getAppointments({ ...filters, sortBy: 'date', sortOrder: 'desc' });
      setAppointments(response.data?.data?.appointments || []);
      setPagination(response.data?.data?.pagination || { total: 0, page: 1, pages: 1, limit: 10 });
    } catch {
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
    } catch {
      setActiveDoctors([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchAppointments(), fetchStats()]);
  }, [fetchAppointments, fetchStats]);

  useEffect(() => {
    Promise.all([refreshAll(), fetchDoctors()]).catch(() => toast.error('Failed to load appointments'));
  }, [refreshAll, fetchDoctors]);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((prev) => ({ ...prev, search: searchInput, page: 1 })), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
      } catch {
        setPatientResults([]);
      } finally {
        setPatientLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const fetchAvailability = useCallback(async (doctorId, date) => {
    try {
      setSlotsLoading(true);
      const response = await getDoctorAvailability(doctorId, date);
      setAvailableSlots(response.data?.data?.availableSlots || []);
    } catch {
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
    } catch {
      setDrawerOpen(false);
      toast.error('Failed to load appointment');
    }
  };

  const runStatus = async (appointment, status) => {
    try {
      await updateAppointmentStatus(appointment._id, { status });
      toast.success(status === 'Checked-In' ? 'Patient checked in ✓' : 'Appointment updated');
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Server error — please try again');
    }
  };

  const submitBook = async () => {
    const next = {};
    if (!bookForm.selectedPatient) next.patient = 'Please select a patient';
    if (!bookForm.selectedDoctor) next.doctor = 'Please select a doctor';
    if (!bookForm.selectedDate) next.date = 'Please select a date';
    if (!bookForm.selectedSlot) next.slot = 'Please select a time slot';
    setBookErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      setBookSaving(true);
      await createAppointment({
        patientId: bookForm.selectedPatient._id,
        doctorId: bookForm.selectedDoctor._id,
        date: bookForm.selectedDate,
        timeSlot: bookForm.selectedSlot,
        reasonForVisit: bookForm.reasonForVisit,
        notes: bookForm.notes,
        ...(targetForReschedule ? { rescheduledFrom: targetForReschedule._id } : {}),
      });
      toast.success(targetForReschedule ? 'Appointment rescheduled' : 'Appointment booked');
      setBookModalOpen(false);
      setRescheduleModal(false);
      setTargetForReschedule(null);
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not book appointment');
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
      toast.warning('Appointment cancelled');
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel');
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
      selectedDate: todayISOInPakistan(),
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

  return (
    <>
      <ReceptionistLayout title="Appointments">
        <AppointmentStatCards stats={stats} />
        <AppointmentFilters filters={filters} setFilters={setFilters} searchInput={searchInput} setSearchInput={setSearchInput} activeDoctors={activeDoctors} onOpenBook={() => setBookModalOpen(true)} />
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
          mode="receptionist"
        />
      </ReceptionistLayout>

      <AppointmentDetailDrawer
        open={drawerOpen}
        appointment={selectedAppt}
        onClose={() => setDrawerOpen(false)}
        onDownloadQr={downloadQR}
        renderActions={(appointment) => (
          <div className="flex flex-wrap gap-2">
            {appointment.status === 'Scheduled' ? <button type="button" onClick={() => runStatus(appointment, 'Checked-In')} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-2.5 py-1 text-[11px] text-teal-100">Check In</button> : null}
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

      <CancelDialog open={cancelDialog} appointment={targetForCancel} reason={cancelReason} setReason={setCancelReason} saving={cancelSaving} onClose={() => setCancelDialog(false)} onConfirm={confirmCancel} />
    </>
  );
}

export default ReceptionistAppointments;

