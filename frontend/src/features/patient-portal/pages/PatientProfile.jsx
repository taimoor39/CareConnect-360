import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';

import { changePassword } from '@/api/settings.js';
import { getPatientDashboard, updateMyProfile } from '@/api/patientPortal.js';
import { PasswordRevealButton } from '@/shared/components/PasswordField.jsx';
import { toInputDate } from '@/utils/dateHelpers.js';

/** Always fixed small size — callers must not replace sizing via className (was blowing up to ~24×24). */
const LockIcon = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
    style={{
      width: 14,
      height: 14,
      minWidth: 14,
      minHeight: 14,
      flexShrink: 0,
      display: 'inline-block',
      verticalAlign: '-0.15em',
    }}
  >
    <path
      d="M8 11V8a4 4 0 0 1 8 0v3M6 11h12v10H6z"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function strengthScore(pw) {
  let score = 0;
  if ((pw || '').length >= 8) score += 1;
  if (/[A-Z]/.test(pw || '')) score += 1;
  if (/[0-9]/.test(pw || '')) score += 1;
  if (/[^A-Za-z0-9]/.test(pw || '')) score += 1;
  if ((pw || '').length >= 12) score += 1;
  return score;
}

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const strengthColor = ['', '#dc2626', '#d97706', '#2563eb', '#16a34a', '#0d9488'];

function PatientProfile() {
  const { patient, user, setPatient } = useOutletContext();
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwVisible, setPwVisible] = useState({ current: false, new: false, confirm: false });

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

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPatientDashboard();
        if (!cancelled) setDash(res.data?.data || null);
      } catch {
        if (!cancelled) setDash(null);
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName =
    patient?.name || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Patient';
  const initials =
    displayName
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'P';

  const statusActive = String(patient?.status || 'active').toLowerCase() === 'active';

  const validateEdit = () => {
    const errs = {};
    if (form.phone && !/^[0-9]{10,15}$/.test(String(form.phone).trim())) {
      errs.phone = 'Enter a valid phone number (10-15 digits)';
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateEdit()) return;
    try {
      setSaving(true);
      const trimOrUndef = (value) => {
        const v = String(value ?? '').trim();
        return v ? v : undefined;
      };
      const payload = {
        firstName: trimOrUndef(form.firstName),
        lastName: trimOrUndef(form.lastName),
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
      setEditing(false);
      setEditErrors({});
      toast.success(res.data?.message || 'Profile updated successfully');
    } catch (e) {
      const firstError = e.response?.data?.errors?.[0];
      toast.error(firstError?.message || e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const mapPwApiErrors = (e) => {
    const data = e.response?.data;
    const rows = Array.isArray(data?.errors) ? data.errors : [];
    const next = { currentPassword: '', newPassword: '', confirmPassword: '' };
    rows.forEach((err) => {
      const field = err.field || err.path;
      if (field && Object.prototype.hasOwnProperty.call(next, field)) {
        next[field] = err.message || '';
      }
    });
    const msg = String(data?.message || '').trim();
    if (!next.currentPassword && /current password|incorrect password/i.test(msg)) {
      next.currentPassword = 'Current password is incorrect';
    }
    setPwErrors(next);
    const hasInline = Object.values(next).some(Boolean);
    if (!hasInline) toast.error(msg || 'Could not change password');
  };

  const validatePwForm = () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!pwForm.newPassword) errs.newPassword = 'New password is required';
    else if (pwForm.newPassword.length < 8) errs.newPassword = 'Minimum 8 characters';
    else if (!/[A-Z]/.test(pwForm.newPassword)) errs.newPassword = 'Must include at least 1 uppercase';
    else if (!/[0-9]/.test(pwForm.newPassword)) errs.newPassword = 'Must include at least 1 number';
    if (!pwForm.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitPw = async () => {
    if (!validatePwForm()) return;
    try {
      setPwSaving(true);
      setPwErrors({});
      await changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      mapPwApiErrors(e);
    } finally {
      setPwSaving(false);
    }
  };

  const pwStrength = strengthScore(pwForm.newPassword);
  const nextAppt = dash?.nextAppointment;
  const nextApptDate =
    nextAppt?.date != null
      ? new Date(nextAppt.date).toLocaleString('en-PK', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Asia/Karachi',
        })
      : null;
  const doctorLabel =
    nextAppt?.doctorId?.name ||
    [nextAppt?.doctorId?.firstName, nextAppt?.doctorId?.lastName].filter(Boolean).join(' ') ||
    '—';

  const fieldShell = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text-secondary)',
    padding: '10px 12px',
  };

  const inputEditStyle = (errKey) => ({
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${editErrors[errKey] ? '#dc2626' : 'rgba(13,148,136,0.3)'}`,
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
  });

  const labelUpper = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '-8px 0 0', fontWeight: 300 }}>
        View your information, care overview, and account security — aligned with your clinic record.
      </p>

      {/* Card 1 — Identity & personal */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Personal information
          </span>
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setForm(initial);
                setEditErrors({});
                setEditing(true);
              }}
              style={{
                padding: '6px 14px',
                background: 'rgba(13,148,136,0.1)',
                border: '1px solid rgba(13,148,136,0.25)',
                borderRadius: 8,
                color: '#2dd4bf',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditErrors({});
                  setForm(initial);
                }}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '6px 14px',
                  background: 'var(--teal)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                  letterSpacing: '-0.3px',
                }}
              >
                {displayName}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 100,
                    padding: '2px 10px',
                  }}
                >
                  {patient?.patientId || patient?.patientCode || '—'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: statusActive ? '#4ade80' : '#f87171',
                    background: statusActive ? 'rgba(22,163,74,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${statusActive ? 'rgba(22,163,74,0.2)' : 'rgba(248,113,113,0.25)'}`,
                    borderRadius: 100,
                    padding: '2px 8px',
                    fontWeight: 600,
                  }}
                >
                  {statusActive ? 'Active' : patient?.status || 'Inactive'}
                </span>
                {patient?.bloodGroup ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#2dd4bf',
                      background: 'rgba(13,148,136,0.1)',
                      border: '1px solid rgba(13,148,136,0.2)',
                      borderRadius: 100,
                      padding: '2px 10px',
                      fontWeight: 500,
                    }}
                  >
                    Blood {patient.bloodGroup}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <div>
              <div style={labelUpper}>First name</div>
              {editing ? (
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  style={inputEditStyle('firstName')}
                />
              ) : (
                <div style={fieldShell}>{form.firstName || '—'}</div>
              )}
            </div>
            <div>
              <div style={labelUpper}>Last name</div>
              {editing ? (
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  style={inputEditStyle('lastName')}
                />
              ) : (
                <div style={fieldShell}>{form.lastName || '—'}</div>
              )}
            </div>
            <div>
              <div style={{ ...labelUpper, display: 'flex', alignItems: 'center', gap: 6 }}>
                <LockIcon className="text-[var(--text-muted)]" />
                Date of birth
              </div>
              <div style={{ ...fieldShell, opacity: 0.9 }}>{form.dateOfBirth || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Contact reception to change DOB
              </div>
            </div>
            <div>
              <div style={{ ...labelUpper, display: 'flex', alignItems: 'center', gap: 6 }}>
                <LockIcon className="text-[var(--text-muted)]" />
                Gender
              </div>
              <div style={{ ...fieldShell, opacity: 0.9 }}>{form.gender}</div>
            </div>
            <div>
              <div style={labelUpper}>Phone</div>
              {editing ? (
                <div>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, phone: e.target.value }));
                      setEditErrors((e2) => ({ ...e2, phone: '' }));
                    }}
                    placeholder="03001234567"
                    style={inputEditStyle('phone')}
                  />
                  {editErrors.phone ? (
                    <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{editErrors.phone}</div>
                  ) : null}
                </div>
              ) : (
                <div style={fieldShell}>{form.phone || '—'}</div>
              )}
            </div>
            <div>
              <div style={{ ...labelUpper, display: 'flex', alignItems: 'center', gap: 6 }}>
                <LockIcon className="text-[var(--text-muted)]" />
                Email (login)
              </div>
              <div style={{ ...fieldShell, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || '—'}</span>
                <LockIcon className="ml-auto text-slate-500" />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Managed by your clinic — contact reception to update
              </div>
            </div>
            <div>
              <div style={labelUpper}>Member since</div>
              <div style={fieldShell}>
                {patient?.createdAt
                  ? new Date(patient.createdAt).toLocaleDateString('en-PK', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'Asia/Karachi',
                    })
                  : '—'}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ ...labelUpper, marginBottom: 12 }}>Address</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ ...labelUpper, fontSize: 10 }}>Line 1</div>
                {editing ? (
                  <input
                    value={form.addressLine1}
                    onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                    style={inputEditStyle('address')}
                  />
                ) : (
                  <div style={fieldShell}>{form.addressLine1 || '—'}</div>
                )}
              </div>
              <div>
                <div style={{ ...labelUpper, fontSize: 10 }}>City</div>
                {editing ? (
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    style={inputEditStyle('city')}
                  />
                ) : (
                  <div style={fieldShell}>{form.city || '—'}</div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ ...labelUpper, marginBottom: 12 }}>Emergency contact</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <div style={{ ...labelUpper, fontSize: 10 }}>Name</div>
                {editing ? (
                  <input
                    value={form.emergencyContactName}
                    onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                    style={inputEditStyle('ecn')}
                  />
                ) : (
                  <div style={fieldShell}>{form.emergencyContactName || '—'}</div>
                )}
              </div>
              <div>
                <div style={{ ...labelUpper, fontSize: 10 }}>Phone</div>
                {editing ? (
                  <input
                    value={form.emergencyContactPhone}
                    onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                    style={inputEditStyle('ecp')}
                  />
                ) : (
                  <div style={fieldShell}>{form.emergencyContactPhone || '—'}</div>
                )}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ ...labelUpper, fontSize: 10 }}>Relationship</div>
                {editing ? (
                  <input
                    value={form.emergencyContactRelation}
                    onChange={(e) => setForm((f) => ({ ...f, emergencyContactRelation: e.target.value }))}
                    style={inputEditStyle('ecr')}
                  />
                ) : (
                  <div style={fieldShell}>{form.emergencyContactRelation || '—'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 — Care overview (schedule analogue) */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Care overview</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LockIcon className="text-[var(--text-muted)]" />
            Appointments managed with your clinic
          </span>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {dashLoading ? (
            <div className="skeleton h-24 w-full rounded-lg" />
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                    }}
                  >
                    Next appointment
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {nextApptDate || 'None scheduled'}
                  </div>
                  {nextAppt?.timeSlot ? (
                    <div style={{ fontSize: 12, color: '#2dd4bf', marginTop: 4 }}>{nextAppt.timeSlot}</div>
                  ) : null}
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                    }}
                  >
                    Provider
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{doctorLabel}</div>
                  {nextAppt?.doctorSpecialization ? (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {nextAppt.doctorSpecialization}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                    }}
                  >
                    Last visit
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {dash?.lastVisitDate
                      ? new Date(dash.lastVisitDate).toLocaleDateString('en-PK', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'Asia/Karachi',
                        })
                      : '—'}
                  </div>
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                    }}
                  >
                    Upcoming (scheduled)
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {dash?.upcoming ?? '—'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, marginBottom: 0 }}>
                Book or reschedule through reception or use <strong>My Appointments</strong> when self-service is enabled.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {dashLoading ? (
          <>
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
          </>
        ) : (
          [
            {
              label: 'Upcoming visits',
              value: dash?.upcoming ?? 0,
              color: '#2dd4bf',
              sub: 'From today',
            },
            {
              label: 'Prescriptions',
              value: dash?.prescriptions ?? 0,
              color: '#60a5fa',
              sub: 'On file',
            },
            {
              label: 'Approved reports',
              value: dash?.reports ?? 0,
              color: 'var(--text-primary)',
              sub: 'Summaries you can read',
            },
            {
              label: 'Age on record',
              value: dash?.patientInfo?.age != null ? String(dash.patientInfo.age) : '—',
              color: '#4ade80',
              sub: 'From clinic profile',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: stat.color,
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{stat.sub}</div>
            </div>
          ))
        )}
      </div>

      {/* Medical notes */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <LockIcon />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Medical notes</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>Read-only</span>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div
            style={{
              ...fieldShell,
              minHeight: 88,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              color: patient?.medicalNotes ? 'var(--text-secondary)' : 'var(--text-muted)',
              fontStyle: patient?.medicalNotes ? 'normal' : 'italic',
            }}
          >
            {patient?.medicalNotes || 'No notes on file. Your care team may add clinical notes here.'}
          </div>
        </div>
      </div>

      {/* Password */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            Change password
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Current password required — same secure flow as clinical staff portals.
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440 }}>
            {[
              {
                field: 'currentPassword',
                label: 'Current password',
                placeholder: 'Enter current password',
                visKey: 'current',
              },
              {
                field: 'newPassword',
                label: 'New password',
                placeholder: 'Min 8 chars, 1 uppercase, 1 number',
                visKey: 'new',
              },
              {
                field: 'confirmPassword',
                label: 'Confirm new password',
                placeholder: 'Repeat new password',
                visKey: 'confirm',
              },
            ].map(({ field, label, placeholder, visKey }) => (
              <div key={field}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {label}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={pwVisible[visKey] ? 'text' : 'password'}
                    autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'}
                    value={pwForm[field]}
                    onChange={(e) => {
                      setPwForm((p) => ({ ...p, [field]: e.target.value }));
                      setPwErrors((p) => ({ ...p, [field]: '' }));
                    }}
                    placeholder={placeholder}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${pwErrors[field] ? '#dc2626' : 'var(--border)'}`,
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <PasswordRevealButton
                    visible={pwVisible[visKey]}
                    onToggle={() => setPwVisible((p) => ({ ...p, [visKey]: !p[visKey] }))}
                    className="!text-[var(--text-muted)] hover:!bg-white/[0.06] hover:!text-[var(--text-secondary)] focus-visible:!ring-teal-500/35"
                  />
                </div>
                {field === 'newPassword' && pwForm.newPassword ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            background:
                              pwStrength >= n ? strengthColor[Math.max(pwStrength, 1)] : 'rgba(255,255,255,0.06)',
                            transition: 'background 0.2s',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: strengthColor[Math.max(pwStrength, 1)] }}>
                      {strengthLabel[pwStrength] || 'Weak'}
                    </div>
                  </div>
                ) : null}
                {field === 'confirmPassword' && pwForm.confirmPassword ? (
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      color: pwForm.newPassword === pwForm.confirmPassword ? '#4ade80' : '#f87171',
                    }}
                  >
                    {pwForm.newPassword === pwForm.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                ) : null}
                {pwErrors[field] ? (
                  <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{pwErrors[field]}</div>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={submitPw}
              disabled={
                pwSaving || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword
              }
              style={{
                padding: '11px 20px',
                background: pwSaving ? 'rgba(13,148,136,0.5)' : 'var(--teal)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: pwSaving ? 'not-allowed' : 'pointer',
                width: 'fit-content',
                boxShadow: '0 2px 12px rgba(13,148,136,0.25)',
              }}
            >
              {pwSaving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientProfile;
