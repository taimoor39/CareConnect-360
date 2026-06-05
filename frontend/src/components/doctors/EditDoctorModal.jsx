import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { updateDoctor } from '../../api/doctors.js';
import useDoctorForm, { defaultDoctorForm } from '../../hooks/useDoctorForm.js';
import CareModal from '@/shared/components/CareModal.jsx';
import { isOvernightShift } from '../../utils/timeHelpers.js';

const toForm = (doctor) => ({
  specialization: doctor?.specialization || doctor?.profile?.specialization || '',
  qualification: doctor?.qualification || doctor?.profile?.qualification || '',
  schedule: {
    days: doctor?.profile?.schedule?.days || [],
    shiftStart: doctor?.profile?.schedule?.shiftStart || '',
    shiftEnd: doctor?.profile?.schedule?.shiftEnd || '',
    maxPatientsPerDay: doctor?.profile?.schedule?.maxPatientsPerDay ?? 20,
    consultationDurationMins: doctor?.profile?.schedule?.consultationDurationMins ?? 30,
  },
  bio: doctor?.profile?.bio || '',
  isActive: typeof doctor?.isActive === 'boolean' ? doctor.isActive : true,
});

function EditDoctorModal({ doctor, isOpen, onClose, onSuccess, setDoctors, setStats }) {
  const [saving, setSaving] = useState(false);
  const form = useDoctorForm(defaultDoctorForm, { mode: 'edit' });

  useEffect(() => {
    if (isOpen && doctor) {
      form.reset(toForm(doctor));
    }
  }, [isOpen, doctor]);

  const toggleDay = (day) => {
    const current = form.formData.schedule.days;
    const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
    form.handleChange('schedule.days', next);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.validate()) return;

    try {
      setSaving(true);
      await updateDoctor(doctor._id, {
        specialization: form.formData.specialization,
        qualification: form.formData.qualification,
        schedule: {
          days: form.formData.schedule.days,
          shiftStart: form.formData.schedule.shiftStart,
          shiftEnd: form.formData.schedule.shiftEnd,
          maxPatientsPerDay: Number(form.formData.schedule.maxPatientsPerDay || 20),
          consultationDurationMins: Number(form.formData.schedule.consultationDurationMins || 30),
        },
        bio: form.formData.bio,
      });

      toast.success(`Dr. ${doctor.name}'s profile has been completed ✅`);
      form.reset(defaultDoctorForm);
      onClose();
      if (typeof onSuccess === 'function') {
        await onSuccess({ setDoctors, setStats });
      }
    } catch (error) {
      const apiErrors = error.response?.data?.errors || [];
      if (error.response?.status === 409) {
        form.setErrors((prev) => ({ ...prev, email: 'Email already registered' }));
        return;
      }
      if (apiErrors.length > 0) {
        const mapped = {};
        apiErrors.forEach((item) => {
          mapped[item.field] = item.message;
        });
        form.setErrors((prev) => ({ ...prev, ...mapped }));
      }
      toast.error(error.response?.data?.message || 'Server error — please try again');
    } finally {
      setSaving(false);
    }
  };

  if (!doctor) return null;

  return (
    <CareModal
      open={isOpen}
      onClose={onClose}
      size="3xl"
      title={
        doctor.profile?.isProfileComplete ? `Edit doctor profile — ${doctor.name}` : `Complete doctor profile — ${doctor.name}`
      }
    >
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 border-b border-[var(--border)] pb-3 text-xs text-[var(--text-secondary)]">
          <p><strong>Name:</strong> {doctor.name}</p>
          <p><strong>Email:</strong> {doctor.email}</p>
          <p><strong>Phone:</strong> {doctor.phone}</p>
          <p className="flex items-center gap-1.5">
            <strong>Status:</strong>
            <span className={`px-1.5 py-0.5 rounded ${doctor.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
              {doctor.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>

        <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <input value={form.formData.specialization} onChange={(e) => form.handleChange('specialization', e.target.value)} onBlur={() => form.handleBlur('specialization')} placeholder="Specialization *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
              {form.errors.specialization ? <p className="mt-1 text-[11px] text-rose-300">{form.errors.specialization}</p> : null}
            </div>
            <div>
              <input value={form.formData.qualification} onChange={(e) => form.handleChange('qualification', e.target.value)} onBlur={() => form.handleBlur('qualification')} placeholder="Qualification *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
              {form.errors.qualification ? <p className="mt-1 text-[11px] text-rose-300">{form.errors.qualification}</p> : null}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-300">Schedule Days *</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {form.validDays.map((day) => (
                <label key={day} className="flex items-center gap-1.5 rounded-md bg-slate-900/70 px-2 py-1.5 text-xs text-slate-200">
                  <input type="checkbox" checked={form.formData.schedule.days.includes(day)} onChange={() => toggleDay(day)} />
                  {day}
                </label>
              ))}
            </div>
            {form.errors['schedule.days'] ? <p className="mt-1 text-[11px] text-rose-300">{form.errors['schedule.days']}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <input
                type="time"
                value={form.formData.schedule.shiftStart}
                onChange={(e) => form.handleChange('schedule.shiftStart', e.target.value)}
                onBlur={() => form.handleBlur('schedule.shiftStart')}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
              />
              {form.errors['schedule.shiftStart'] ? <p className="mt-1 text-[11px] text-rose-300">{form.errors['schedule.shiftStart']}</p> : null}
            </div>
            <div>
              <input
                type="time"
                value={form.formData.schedule.shiftEnd}
                onChange={(e) => form.handleChange('schedule.shiftEnd', e.target.value)}
                onBlur={() => form.handleBlur('schedule.shiftEnd')}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
              />
              {form.errors['schedule.shiftEnd'] ? <p className="mt-1 text-[11px] text-rose-300">{form.errors['schedule.shiftEnd']}</p> : null}
            </div>
            {isOvernightShift(form.formData.schedule.shiftStart, form.formData.schedule.shiftEnd) ? (
              <p className="md:col-span-2 rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                Overnight shift — end time is on the next calendar day (same as backend slot generator).
              </p>
            ) : null}
            <div>
              <input
                type="number"
                min="1"
                max="100"
                value={form.formData.schedule.maxPatientsPerDay}
                onChange={(e) => form.handleChange('schedule.maxPatientsPerDay', e.target.value)}
                onBlur={() => form.handleBlur('schedule.maxPatientsPerDay')}
                placeholder="Max Patients/Day"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
              />
              {form.errors['schedule.maxPatientsPerDay'] ? (
                <p className="mt-1 text-[11px] text-rose-300">{form.errors['schedule.maxPatientsPerDay']}</p>
              ) : null}
            </div>
            <div>
              <input
                type="number"
                min="10"
                max="120"
                value={form.formData.schedule.consultationDurationMins}
                onChange={(e) => form.handleChange('schedule.consultationDurationMins', e.target.value)}
                onBlur={() => form.handleBlur('schedule.consultationDurationMins')}
                placeholder="Consultation Duration"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
              />
              {form.errors['schedule.consultationDurationMins'] ? (
                <p className="mt-1 text-[11px] text-rose-300">{form.errors['schedule.consultationDurationMins']}</p>
              ) : null}
            </div>
          </div>

          <textarea rows="3" value={form.formData.bio} onChange={(e) => form.handleChange('bio', e.target.value)} placeholder="Bio / Notes" className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs w-full" />
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-400">
            Minimum schedule requirements: select at least 1 day, and optionally set valid `HH:MM` start/end times.
            Matching times or blank times are treated as 24-hour availability.
            Optional limits: max patients/day `1-100`, consultation duration `10-120` minutes.
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-70">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
    </CareModal>
  );
}

export default EditDoctorModal;