import { normalizeISODateInput } from './isoDate.js';

/**
 * Maps an appointment row (list or detail) into BookAppointmentModal / reschedule state.
 */
export function bookFormPrefillFromAppointment(appointment) {
  if (!appointment) {
    return {
      selectedPatient: null,
      selectedDoctor: null,
      selectedDate: '',
      selectedSlot: '',
      reasonForVisit: '',
      notes: '',
    };
  }

  let selectedDate = '';
  const rawDate = appointment.date;
  if (rawDate != null && rawDate !== '') {
    if (typeof rawDate === 'string') {
      selectedDate = normalizeISODateInput(rawDate);
    } else if (rawDate instanceof Date) {
      selectedDate = normalizeISODateInput(rawDate.toISOString());
    }
  }

  return {
    selectedPatient: appointment.patientId || null,
    selectedDoctor: appointment.doctorId || null,
    selectedDate,
    selectedSlot: appointment.timeSlot || '',
    reasonForVisit: appointment.reasonForVisit || '',
    notes: appointment.notes || '',
  };
}
