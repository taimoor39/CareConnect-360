import { useEffect, useMemo } from 'react';

import {
  currentYearInPakistan,
  formatDateInPakistan,
  parseLocalDateFromISO,
  todayISOInPakistan,
} from '../../utils/isoDate.js';
import DateDropdown from '../ui/DateDropdown.jsx';
import PatientSearchDropdown from './PatientSearchDropdown.jsx';
import TimeSlotPicker from './TimeSlotPicker.jsx';

const dayShortMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const generateSlots = (schedule) => {
  if (!schedule?.shiftStart || !schedule?.shiftEnd) return [];
  const [sH, sM] = schedule.shiftStart.split(':').map(Number);
  const [eH, eM] = schedule.shiftEnd.split(':').map(Number);
  const duration = Number(schedule.consultationDurationMins || 30);
  const start = sH * 60 + sM;
  const end = eH * 60 + eM;
  const slots = [];
  for (let t = start; t + duration <= end; t += duration) {
    const hh1 = String(Math.floor(t / 60)).padStart(2, '0');
    const mm1 = String(t % 60).padStart(2, '0');
    const t2 = t + duration;
    const hh2 = String(Math.floor(t2 / 60)).padStart(2, '0');
    const mm2 = String(t2 % 60).padStart(2, '0');
    slots.push({ full: `${hh1}:${mm1}-${hh2}:${mm2}`, start: `${hh1}:${mm1}` });
  }
  return slots;
};

function BookAppointmentModal({
  open,
  onClose,
  bookForm,
  setBookForm,
  activeDoctors,
  patientSearch,
  setPatientSearch,
  patientResults,
  patientLoading,
  onSelectPatient,
  availableSlots,
  slotsLoading,
  errors,
  saving,
  onSubmit,
  onFetchAvailability,
}) {
  const selectedDoctor = useMemo(
    () => activeDoctors.find((doctor) => doctor._id === bookForm.selectedDoctor?._id) || null,
    [activeDoctors, bookForm.selectedDoctor]
  );
  const allSlots = useMemo(() => generateSlots(selectedDoctor?.profile?.schedule), [selectedDoctor]);
  const selectedDateObj = useMemo(
    () => parseLocalDateFromISO(bookForm.selectedDate),
    [bookForm.selectedDate]
  );
  const selectedDayShort = selectedDateObj ? dayShortMap[selectedDateObj.getDay()] : '';

  useEffect(() => {
    if (bookForm.selectedDoctor && selectedDateObj) {
      onFetchAvailability(bookForm.selectedDoctor._id, bookForm.selectedDate);
    }
  }, [bookForm.selectedDoctor, bookForm.selectedDate, selectedDateObj, onFetchAvailability]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Book New Appointment</h3>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">Patient, Schedule and Confirmation</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
            <PatientSearchDropdown
              patientSearch={patientSearch}
              setPatientSearch={setPatientSearch}
              results={patientResults}
              loading={patientLoading}
              onSelect={onSelectPatient}
            />
            {errors.patient ? <p className="mt-1 text-[11px] text-rose-300">{errors.patient}</p> : null}
            {bookForm.selectedPatient ? (
              <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-300">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-white">{bookForm.selectedPatient.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBookForm((prev) => ({ ...prev, selectedPatient: null }));
                      setPatientSearch('');
                    }}
                    className="text-slate-400 transition hover:text-slate-200"
                  >
                    x
                  </button>
                </div>
                <p>Code: {bookForm.selectedPatient.patientId || bookForm.selectedPatient.patientCode}</p>
                <p>DOB: {bookForm.selectedPatient.dateOfBirth ? formatDateInPakistan(bookForm.selectedPatient.dateOfBirth) : '--'}</p>
                <p>Blood Group: {bookForm.selectedPatient.bloodGroup || '--'}</p>
              </div>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
            <p className="text-[11px] font-medium tracking-[0.08em] text-slate-300">DOCTOR</p>
            <select
              value={bookForm.selectedDoctor?._id || ''}
              onChange={(event) => {
                const doctor = activeDoctors.find((item) => item._id === event.target.value) || null;
                setBookForm((prev) => ({ ...prev, selectedDoctor: doctor, selectedSlot: '' }));
              }}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-100 outline-none transition focus:border-teal-300/70 focus:ring-2 focus:ring-teal-400/20"
            >
              <option value="">Select Doctor</option>
              {activeDoctors
                .filter((doctor) => doctor.isActive && doctor.profile?.isProfileComplete)
                .map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>Dr. {doctor.name} - {doctor.specialization || doctor.profile?.specialization || '--'}</option>
                ))}
            </select>
            {errors.doctor ? <p className="mt-1 text-[11px] text-rose-300">{errors.doctor}</p> : null}
            <DateDropdown
              value={bookForm.selectedDate}
              onChange={(iso) => setBookForm((prev) => ({ ...prev, selectedDate: iso, selectedSlot: '' }))}
              minDate={todayISOInPakistan()}
              maxDate="2100-12-31"
              yearFrom={currentYearInPakistan()}
              yearTo={currentYearInPakistan() + 3}
              placeholder={['Day', 'Month', 'Year']}
              className="mt-2"
            />
            {selectedDoctor?.profile?.schedule?.days?.length > 0 && selectedDayShort && !selectedDoctor.profile.schedule.days.includes(selectedDayShort) ? (
              <p className="mt-1 text-[11px] text-rose-300">Dr. {selectedDoctor.name} is not available on {selectedDayShort}</p>
            ) : null}
            {errors.date ? <p className="mt-1 text-[11px] text-rose-300">{errors.date}</p> : null}
            <p className="mt-3 text-[11px] font-medium tracking-[0.08em] text-slate-300">TIME SLOTS</p>
            <TimeSlotPicker
              slots={allSlots}
              availableStarts={availableSlots}
              loading={slotsLoading}
              selectedSlot={bookForm.selectedSlot}
              onSelect={(slot) => setBookForm((prev) => ({ ...prev, selectedSlot: slot }))}
            />
            {errors.slot ? <p className="mt-1 text-[11px] text-rose-300">{errors.slot}</p> : null}
          </div>
        </div>
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
          <textarea
            value={bookForm.reasonForVisit}
            onChange={(event) => setBookForm((prev) => ({ ...prev, reasonForVisit: event.target.value }))}
            placeholder="Reason for Visit (optional)"
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-teal-300/70 focus:ring-2 focus:ring-teal-400/20"
          />
          <p className="text-[11px] text-slate-500">{bookForm.reasonForVisit.length}/200</p>
          <textarea
            value={bookForm.notes}
            onChange={(event) => setBookForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes (optional)"
            rows={3}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-teal-300/70 focus:ring-2 focus:ring-teal-400/20"
          />
          <p className="text-[11px] text-slate-500">{bookForm.notes.length}/500</p>
        </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-400">Step 3 of 3</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 transition hover:bg-slate-800">Cancel</button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!bookForm.selectedPatient || !bookForm.selectedDoctor || !bookForm.selectedDate || !bookForm.selectedSlot || saving}
              className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? 'Booking...' : 'Book Appointment →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookAppointmentModal;
