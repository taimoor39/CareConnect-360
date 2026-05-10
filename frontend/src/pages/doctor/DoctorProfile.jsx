import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import axiosInstance from '../../api/client.js';
import { getDoctorProfile, updateDoctorProfile } from '../../api/doctor.js';
import DoctorLayout from '@/shared/layouts/DoctorLayout.jsx';
import { PasswordRevealButton } from '@/shared/components/PasswordField.jsx';

function DoctorProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ phone: '', bio: '' });
  const [editErrors, setEditErrors] = useState({});

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwVisible, setPwVisible] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    getDoctorProfile()
      .then((r) => {
        const d = r.data?.data;
        setProfile(d);
        setEditForm({
          phone: d?.phone || '',
          bio: d?.bio || '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const getPasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    if (pw.length >= 12) score += 1;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColor = ['', '#dc2626', '#d97706', '#2563eb', '#16a34a', '#0d9488'];

  const validateEditForm = () => {
    const errs = {};
    if (editForm.phone && !/^[0-9]{10,15}$/.test(editForm.phone)) {
      errs.phone = 'Enter a valid phone number (10-15 digits)';
    }
    if (editForm.bio && editForm.bio.length > 500) {
      errs.bio = 'Bio cannot exceed 500 characters';
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePwForm = () => {
    const errs = {};
    if (!pwForm.currentPassword) {
      errs.currentPassword = 'Current password is required';
    }
    if (!pwForm.newPassword) {
      errs.newPassword = 'New password is required';
    } else if (pwForm.newPassword.length < 8) {
      errs.newPassword = 'Minimum 8 characters';
    } else if (!/[A-Z]/.test(pwForm.newPassword)) {
      errs.newPassword = 'Must include at least 1 uppercase';
    } else if (!/[0-9]/.test(pwForm.newPassword)) {
      errs.newPassword = 'Must include at least 1 number';
    }
    if (!pwForm.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (pwForm.newPassword !== pwForm.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mapApiErrors = (errorsArr, setter) => {
    if (!Array.isArray(errorsArr) || errorsArr.length === 0) return;
    const map = {};
    errorsArr.forEach((e) => {
      if (e.field) map[e.field] = e.message;
    });
    if (Object.keys(map).length) setter(map);
  };

  const handleSaveProfile = async () => {
    if (!validateEditForm()) return;
    setSaving(true);
    try {
      await updateDoctorProfile(editForm);
      setProfile((prev) => (prev ? { ...prev, ...editForm } : prev));
      setEditing(false);
      setEditErrors({});
      toast.success('Profile updated successfully');
    } catch (err) {
      const payload = err.response?.data;
      if (Array.isArray(payload?.errors)) {
        mapApiErrors(payload.errors, setEditErrors);
      }
      toast.error(payload?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePwForm()) return;
    setPwSaving(true);
    try {
      await axiosInstance.put('/settings/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      });
      setPwForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPwErrors({});
      toast.success('Password changed successfully');
    } catch (err) {
      const payload = err.response?.data;
      const msg = String(payload?.message || '').toLowerCase();
      const errs = payload?.errors;
      if (
        msg.includes('current') ||
        msg.includes('incorrect') ||
        (Array.isArray(errs) && errs.some((e) => String(e.field || '').includes('current')))
      ) {
        setPwErrors((prev) => ({
          ...prev,
          currentPassword: 'Current password is incorrect',
        }));
      } else if (Array.isArray(errs) && errs.length) {
        mapApiErrors(errs, setPwErrors);
      } else {
        toast.error(payload?.message || 'Failed to change password');
      }
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <DoctorLayout title="My Profile">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: 120,
                borderRadius: 12,
                marginBottom: 16,
              }}
            />
          ))}
        </div>
      </DoctorLayout>
    );
  }

  const pwStrength = getPasswordStrength(pwForm.newPassword);
  const initials = (profile?.name || 'D')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatDays = (days) => {
    if (!days || days.length === 0) return 'Not set';
    const all = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const abbr = days.map((d) => all.find((a) => a === d || (d && a.startsWith(d[0])))).filter(Boolean);
    return abbr.join(', ');
  };

  const formatTime = (t) => {
    if (!t) return '—';
    const parts = String(t).split(':').map(Number);
    const h = parts[0];
    const m = parts[1] ?? 0;
    if (Number.isNaN(h)) return '—';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const statusActive = !!profile?.isActive;

  return (
    <DoctorLayout title="My Profile">
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            margin: '-8px 0 0',
            fontWeight: 300,
          }}
        >
          View your professional information and manage account settings
        </p>

        {/* Professional */}
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
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Professional Information
            </span>
            {!editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditForm({
                    phone: profile?.phone || '',
                    bio: profile?.bio || '',
                  });
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
                    setEditForm({
                      phone: profile.phone || '',
                      bio: profile.bio || '',
                    });
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
                  onClick={handleSaveProfile}
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
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 20,
                marginBottom: 24,
              }}
            >
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
                  Dr. {profile?.name}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {profile?.specialization ? (
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
                      {profile.specialization}
                    </span>
                  ) : null}
                  {profile?.qualification ? (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{profile.qualification}</span>
                  ) : null}
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
                    {statusActive ? 'Active' : 'Inactive'}
                  </span>
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
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  Email Address
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.email}</span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="2"
                    style={{ marginLeft: 'auto', flexShrink: 0 }}
                    aria-hidden
                  >
                    <title>Managed by admin</title>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Contact admin to update email
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  Phone Number
                </div>
                {editing ? (
                  <div>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => {
                        setEditForm((p) => ({ ...p, phone: e.target.value }));
                        setEditErrors((p) => ({ ...p, phone: '' }));
                      }}
                      placeholder="03001234567"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${editErrors.phone ? '#dc2626' : 'rgba(13,148,136,0.3)'}`,
                        borderRadius: 8,
                        color: 'var(--text-primary)',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                    {editErrors.phone ? (
                      <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{editErrors.phone}</div>
                    ) : null}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {profile?.phone || '—'}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  Member Since
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {profile?.memberSince
                    ? new Date(profile.memberSince).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'Asia/Karachi',
                      })
                    : '—'}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  Profile Status
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: profile?.isProfileComplete ? '#4ade80' : '#fbbf24',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    {profile?.isProfileComplete ? 'Profile Complete' : 'Incomplete — Contact admin'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}
              >
                Bio / Notes
                {editing ? (
                  <span style={{ fontWeight: 400, marginLeft: 8, color: '#475569', fontSize: 10 }}>
                    {editForm.bio.length}/500
                  </span>
                ) : null}
              </div>
              {editing ? (
                <div>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => {
                      setEditForm((p) => ({ ...p, bio: e.target.value }));
                      setEditErrors((p) => ({ ...p, bio: '' }));
                    }}
                    placeholder="A brief description about yourself, your expertise, and approach..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${editErrors.bio ? '#dc2626' : 'rgba(13,148,136,0.3)'}`,
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                  {editErrors.bio ? (
                    <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{editErrors.bio}</div>
                  ) : null}
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: profile?.bio ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontStyle: profile?.bio ? 'normal' : 'italic',
                    minHeight: 60,
                    lineHeight: 1.6,
                  }}
                >
                  {profile?.bio || 'No bio added yet. Click Edit to add one.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule */}
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
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>My Schedule</span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Managed by admin
            </span>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
                  Working Days
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {formatDays(profile?.schedule?.days)}
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
                  Shift Hours
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {formatTime(profile?.schedule?.shiftStart)} — {formatTime(profile?.schedule?.shiftEnd)}
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
                  Max Patients/Day
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {profile?.schedule?.maxPatientsPerDay ?? '—'}
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
                  Slot Duration
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {profile?.schedule?.consultationDurationMins ?? '—'}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 3 }}>min</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const active = profile?.schedule?.days?.includes(day);
                return (
                  <div
                    key={day}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 500,
                      background: active ? 'rgba(13,148,136,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(13,148,136,0.25)' : 'var(--border)'}`,
                      color: active ? '#2dd4bf' : 'var(--text-muted)',
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          {[
            {
              label: 'Total Consultations',
              value: profile?.stats?.totalConsultations ?? 0,
              color: '#2dd4bf',
              sub: 'All time',
            },
            {
              label: 'This Month',
              value: profile?.stats?.monthConsultations ?? 0,
              color: '#60a5fa',
              sub: 'Consultations',
            },
            {
              label: 'Total Appointments',
              value: profile?.stats?.totalAppointments ?? 0,
              color: 'var(--text-primary)',
              sub: 'All time',
            },
            {
              label: 'Completion Rate',
              value: `${profile?.stats?.completionRate ?? 0}%`,
              color:
                (profile?.stats?.completionRate ?? 0) >= 80
                  ? '#4ade80'
                  : (profile?.stats?.completionRate ?? 0) >= 50
                    ? '#fbbf24'
                    : '#f87171',
              sub: 'Completed vs total',
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
          ))}
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
              Change Password
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Update your account password regularly for security
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440 }}>
              {[
                { field: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password', visKey: 'current' },
                { field: 'newPassword', label: 'New Password', placeholder: 'Min 8 chars, 1 uppercase, 1 number', visKey: 'new' },
                {
                  field: 'confirmPassword',
                  label: 'Confirm New Password',
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
                      onFocus={(e) => {
                        e.target.style.borderColor = pwErrors[field] ? '#dc2626' : 'rgba(13,148,136,0.4)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = pwErrors[field] ? '#dc2626' : 'var(--border)';
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
                onClick={handleChangePassword}
                disabled={pwSaving}
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
                  transition: 'all 0.15s',
                }}
              >
                {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DoctorLayout>
  );
}

export default DoctorProfile;
