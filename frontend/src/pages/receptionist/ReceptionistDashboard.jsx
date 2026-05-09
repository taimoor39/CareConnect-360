import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { createAppointment, getDoctorAvailability, searchPatients, updateAppointmentStatus } from '../../api/appointments.js';
import { getDoctors } from '../../api/doctors.js';
import { createPatient } from '../../api/patients.js';
import { requestPortalAccess } from '../../api/portalAccess.js';
import { getReceptionistStats, getTodayQueue } from '../../api/receptionist.js';
import BookAppointmentModal from '../../components/appointments/BookAppointmentModal.jsx';
import CancelDialog from '../../components/appointments/CancelDialog.jsx';
import AddPatientModal from '../../components/patients/AddPatientModal.jsx';
import ReceptionistLayout from '@/shared/layouts/ReceptionistLayout.jsx';
import ReceptionistStatCards from '../../components/receptionist/ReceptionistStatCards.jsx';
import TodayQueue from '../../components/receptionist/TodayQueue.jsx';
import { formatDateInPakistan, todayISOInPakistan } from '../../utils/isoDate.js';

function normalizePatientPayload(formData) {
  return {
    firstName: String(formData.firstName || '').trim(),
    lastName: String(formData.lastName || '').trim(),
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    phone: String(formData.phone || '').trim(),
    email: String(formData.email || '').trim().toLowerCase(),
    bloodGroup: formData.bloodGroup || '',
    status: formData.status || 'Active',
    addressStreet: String(formData.addressStreet || '').trim(),
    city: String(formData.city || '').trim(),
    medicalNotes: String(formData.medicalNotes || '').trim(),
  };
}

function ReceptionistDashboard() {
  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [activeDoctors, setActiveDoctors] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookErrors, setBookErrors] = useState({});
  const [bookSaving, setBookSaving] = useState(false);
  const [bookForm, setBookForm] = useState({
    selectedPatient: null,
    selectedDoctor: null,
    selectedDate: todayISOInPakistan(),
    selectedSlot: '',
    reasonForVisit: '',
    notes: '',
  });
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [targetForCancel, setTargetForCancel] = useState(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, queueRes] = await Promise.all([getReceptionistStats(), getTodayQueue()]);
      setStats(statsRes.data?.data || {});
      setQueue(queueRes.data?.data?.appointments || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 30000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await getDoctors({ status: 'active', page: 1, limit: 200 });
        setActiveDoctors(res.data?.data || []);
      } catch {
        setActiveDoctors([]);
      }
    };
    run();
  }, []);

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

  const onFetchAvailability = useCallback(async (doctorId, date) => {
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

  const submitPatient = async (formData, helpers) => {
    try {
      setCreateSaving(true);
      const created = await createPatient(normalizePatientPayload(formData));
      const createdPatientId = created.data?.data?.patient?._id || created.data?.data?._id || null;
      const portalRequested = Boolean(helpers?.portalAccess?.requested);
      if (portalRequested && createdPatientId) {
        try {
          await requestPortalAccess({
            patientId: createdPatientId,
            requestedEmail: helpers.portalAccess.email,
          });
          toast.success('Patient registered. Portal access request submitted for admin approval.');
        } catch (portalError) {
          if (portalError.response?.status === 409) {
            helpers?.setPortalAccessError?.('This email is already registered');
            return false;
          }
          toast.success('Patient registered successfully');
          toast.warning('Portal access request could not be submitted. Try again from patient details.');
        }
      } else {
        toast.success('Patient registered successfully');
      }
      await fetchAll();
      return true;
    } catch (error) {
      if (error.response?.status === 409 && /phone/i.test(error.response?.data?.message || '')) {
        helpers?.setErrors?.((prev) => ({ ...prev, phone: 'Phone number already registered' }));
      } else {
        toast.error('Failed to register patient');
      }
      return false;
    } finally {
      setCreateSaving(false);
    }
  };

  const submitBook = async () => {
    const nextErrors = {};
    if (!bookForm.selectedPatient) nextErrors.patient = 'Please select a patient';
    if (!bookForm.selectedDoctor) nextErrors.doctor = 'Please select a doctor';
    if (!bookForm.selectedDate) nextErrors.date = 'Please select a date';
    if (!bookForm.selectedSlot) nextErrors.slot = 'Please select a time slot';
    setBookErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      setBookSaving(true);
      await createAppointment({
        patientId: bookForm.selectedPatient._id,
        doctorId: bookForm.selectedDoctor._id,
        date: bookForm.selectedDate,
        timeSlot: bookForm.selectedSlot,
        reasonForVisit: bookForm.reasonForVisit,
        notes: bookForm.notes,
      });
      toast.success('Appointment booked successfully');
      setBookModalOpen(false);
      setBookForm({
        selectedPatient: null,
        selectedDoctor: null,
        selectedDate: todayISOInPakistan(),
        selectedSlot: '',
        reasonForVisit: '',
        notes: '',
      });
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBookSaving(false);
    }
  };

  const runStatus = async (appointment, status) => {
    try {
      if (status === 'Checked-In') {
        const ok = window.confirm(`Check in ${appointment.patientId?.name || 'this patient'}?`);
        if (!ok) return;
      }
      await updateAppointmentStatus(appointment._id, { status, ...(status === 'Cancelled' ? { cancellationReason: cancelReason.trim() } : {}) });
      if (status === 'Checked-In') {
        const name = appointment.patientId?.name || 'Patient';
        toast.success(`Patient ${name} checked in`, { autoClose: 5000 });
      }
      if (status === 'Cancelled') toast.warning('Appointment cancelled');
      setCancelDialog(false);
      setCancelReason('');
      setTargetForCancel(null);
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update appointment');
    } finally {
      setCancelSaving(false);
    }
  };

  const sortedQueue = useMemo(
    () => [...queue].sort((a, b) => String(a.timeSlot || '').localeCompare(String(b.timeSlot || ''))),
    [queue]
  );

  return (
    <>
      <ReceptionistLayout title="Dashboard" subline={formatDateInPakistan(new Date(), 'en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}>
        <ReceptionistStatCards stats={stats} loading={loading} />

        <TodayQueue
          queue={sortedQueue}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAll();
          }}
          onCheckIn={(row) => runStatus(row, 'Checked-In')}
          onCancelClick={(row) => {
            setTargetForCancel(row);
            setCancelReason('');
            setCancelDialog(true);
          }}
          onReschedule={() => setBookModalOpen(true)}
        />

        <section className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setAddPatientOpen(true)} className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-900">+ Register Patient</button>
          <button type="button" onClick={() => setBookModalOpen(true)} className="rounded-lg border border-teal-300/30 bg-teal-400/10 px-4 py-2 text-xs font-semibold text-teal-100">+ Book Appointment</button>
        </section>
      </ReceptionistLayout>

      <AddPatientModal open={addPatientOpen} onClose={() => setAddPatientOpen(false)} onSubmit={submitPatient} saving={createSaving} />

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
        onFetchAvailability={onFetchAvailability}
      />

      <CancelDialog
        open={cancelDialog}
        appointment={targetForCancel}
        reason={cancelReason}
        setReason={setCancelReason}
        saving={cancelSaving}
        onClose={() => setCancelDialog(false)}
        onConfirm={() => {
          setCancelSaving(true);
          runStatus(targetForCancel, 'Cancelled');
        }}
      />
    </>
  );
}

export default ReceptionistDashboard;

