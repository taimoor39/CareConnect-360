import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { changePassword } from '../../api/settings.js';
import { updateMyProfile } from '../../api/patientPortal.js';
import { toInputDate } from '../../utils/dateHelpers.js';
import { useOutletContext } from 'react-router-dom';

const AVATAR_COLORS = [
  { id: 'teal', ring: 'ring-teal-400/50', bg: 'from-teal-400 to-teal-700' },
  { id: 'sky', ring: 'ring-sky-400/50', bg: 'from-sky-400 to-sky-700' },
  { id: 'violet', ring: 'ring-violet-400/50', bg: 'from-violet-400 to-violet-700' },
  { id: 'emerald', ring: 'ring-emerald-400/50', bg: 'from-emerald-400 to-emerald-700' },
];

const LS_AVATAR = 'cc360_patient_avatar_color';

function strength(newPassword) {
  let score = 0;
  if ((newPassword || '').length >= 8) score += 1;
  if (/[A-Z]/.test(newPassword || '')) score += 1;
  if (/[0-9]/.test(newPassword || '')) score += 1;
  if (score <= 1) return { label: 'Weak', width: '33%', tone: 'bg-rose-500' };
  if (score === 2) return { label: 'Fair', width: '66%', tone: 'bg-amber-500' };
  return { label: 'Strong', width: '100%', tone: 'bg-emerald-500' };
}

function PatientProfile() {
  const { patient, user, setPatient } = useOutletContext();
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem(LS_AVATAR) || 'teal');
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const initial = useMemo(
    () => ({
      firstName: patient?.firstName || '',
      lastName: patient?.lastName || '',
      dateOfBirth: toInputDate(patient?.dateOfBirth),
      gender: patient?.gender || 'Other',
      phone: patient?.phone || '',
      addressLine1: patient?.address?.line1 || patient?.address?.street || '',
      city: patient?.address?.city || '',
      emergencyContactName: patient?.emergencyContact?.name || '',
      emergencyContactPhone: patient?.emergencyContact?.phone || '',
      emergencyContactRelation: patient?.emergencyContact?.relation || '',
    }),
    [patient],
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    localStorage.setItem(LS_AVATAR, avatarColor);
  }, [avatarColor]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  const save = async () => {
    try {
      setSaving(true);
      const trimOrUndef = (value) => {
        const v = String(value ?? '').trim();
        return v ? v : undefined;
      };
      const payload = {
        firstName: trimOrUndef(form.firstName),
        lastName: trimOrUndef(form.lastName),
        dateOfBirth: trimOrUndef(form.dateOfBirth),
        gender: trimOrUndef(form.gender),
        phone: trimOrUndef(form.phone),
        address: { line1: trimOrUndef(form.addressLine1), city: trimOrUndef(form.city) },
        emergencyContact: {
          name: trimOrUndef(form.emergencyContactName),
          phone: trimOrUndef(form.emergencyContactPhone),
          relation: trimOrUndef(form.emergencyContactRelation),
        },
      };
      const res = await updateMyProfile(payload);
      setPatient(res.data?.data || res.data?.patient);
      toast.success(res.data?.message || 'Profile updated successfully');
    } catch (e) {
      const firstError = e.response?.data?.errors?.[0];
      toast.error(firstError?.message || e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const submitPw = async () => {
    if (pw.newPassword !== pw.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setPwSaving(true);
      await changePassword({
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
        confirmPassword: pw.confirmPassword,
      });
      toast.success('Password changed successfully');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not change password');
    } finally {
      setPwSaving(false);
    }
  };

  const displayName = patient?.name || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim();
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'P';
  const color = AVATAR_COLORS.find((c) => c.id === avatarColor) || AVATAR_COLORS[0];
  const s = strength(pw.newPassword);
  const matches = pw.confirmPassword && pw.confirmPassword === pw.newPassword;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.4fr]">
      <aside className="space-y-6">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 text-center">
          <div
            className={`mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-full bg-gradient-to-br ${color.bg} text-3xl font-semibold text-slate-950 shadow-lg ring-4 ${color.ring}`}
          >
            {initials}
          </div>
          <p className="mt-4 text-xs text-slate-500">Avatar accent</p>
          <div className="mt-2 flex justify-center gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.id}
                onClick={() => setAvatarColor(c.id)}
                className={`h-7 w-7 rounded-full bg-gradient-to-br ${c.bg} ring-2 ${avatarColor === c.id ? 'ring-white' : 'ring-transparent'}`}
              />
            ))}
          </div>
          <p className="mt-6 text-xl font-semibold text-white">{displayName}</p>
          <p className="mt-1 font-mono text-xs text-slate-500">{patient?.patientId || patient?.patientCode}</p>
          <p className="mt-3 inline-flex rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">Status: {patient?.status || '—'}</p>
          {patient?.bloodGroup ? (
            <p className="mt-2 inline-flex rounded-full border border-teal-500/30 px-2 py-1 text-[11px] text-teal-100">Blood {patient.bloodGroup}</p>
          ) : null}
          <p className="mt-4 text-xs text-slate-500">Member since {patient?.createdAt ? new Date(patient.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' }) : '—'}</p>

          <div className="mt-6 space-y-3 border-t border-slate-800 pt-4 text-left text-xs text-slate-400">
            <p className="flex items-center gap-2">
              <span aria-hidden="true">
                🔒
              </span>
              Blood group, status, and medical history can only be changed by reception.
            </p>
          </div>
        </div>
      </aside>

      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-teal-300/90">Personal information</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-slate-400">
              First name *
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Last name *
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Date of birth
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Gender
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="block text-xs text-slate-400">
              Phone *
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Email (login)
              <input value={user?.email || ''} readOnly className="mt-1 h-10 w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-500" />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-teal-300/90">Address</h3>
          <div className="mt-4 space-y-4">
            <label className="block text-xs text-slate-400">
              Address line 1
              <input
                value={form.addressLine1}
                onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-400">
              City
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-teal-300/90">Emergency contact</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-slate-400">
              Contact name
              <input
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Contact phone
              <input
                value={form.emergencyContactPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-400 sm:col-span-2">
              Relationship
              <input
                value={form.emergencyContactRelation}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactRelation: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Medical notes 🔒</h3>
          <textarea
            readOnly
            value={patient?.medicalNotes || ''}
            rows={4}
            className="mt-3 w-full resize-none rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-500"
            placeholder="None"
            title="Contact your doctor to update medical notes"
          />
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={save}
            className="rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <button type="button" onClick={() => setPwOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
            <span className="text-sm font-semibold text-white">Change password</span>
            <span className="text-slate-400">{pwOpen ? '▲' : '▼'}</span>
          </button>
          {pwOpen ? (
            <div className="mt-4 max-w-md space-y-3">
              <label className="block text-xs text-slate-400">
                Current password
                <input
                  type="password"
                  value={pw.currentPassword}
                  onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-400">
                New password
                <input
                  type="password"
                  value={pw.newPassword}
                  onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm"
                />
              </label>
              <div className="h-1 overflow-hidden rounded bg-slate-800">
                <div className={`h-full ${s.tone}`} style={{ width: s.width }} />
              </div>
              <p className="text-[11px] text-slate-500">{s.label}</p>
              <label className="block text-xs text-slate-400">
                Confirm new password
                <input
                  type="password"
                  value={pw.confirmPassword}
                  onChange={(e) => setPw((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm"
                />
              </label>
              {pw.confirmPassword ? <p className={`text-[11px] ${matches ? 'text-emerald-300' : 'text-rose-300'}`}>{matches ? 'Passwords match' : 'Passwords do not match'}</p> : null}
              <button
                type="button"
                disabled={pwSaving || !pw.currentPassword || !pw.newPassword || !matches}
                onClick={submitPw}
                className="rounded-lg border border-teal-400/30 bg-teal-500/10 px-4 py-2 text-xs font-semibold text-teal-100 disabled:opacity-40"
              >
                {pwSaving ? 'Updating…' : 'Change password'}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default PatientProfile;
