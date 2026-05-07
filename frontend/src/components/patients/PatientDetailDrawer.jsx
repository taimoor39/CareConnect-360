import { useState } from 'react';
import PortalStatusBadge from '../portalAccess/PortalStatusBadge.jsx';
import { formatDate } from '../../utils/dateHelpers.js';

const statusBadgeClass = {
  Active: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25',
  Inactive: 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/25',
  Discharged: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25',
};

const getInitials = (patient) => {
  const parts = String(patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`).trim().split(/\s+/);
  const first = (parts[0] || '').charAt(0);
  const last = (parts[1] || '').charAt(0);
  return `${first}${last}`.toUpperCase() || 'P';
};

function PatientDetailDrawer({
  patient,
  open,
  onClose,
  onEdit,
  onArchive,
  onCreateLogin,
  onRequestPortalAccess,
  requestingPortalAccess = false,
  showArchive = true,
}) {
  const [showPortalRequestForm, setShowPortalRequestForm] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  if (!open || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Patient Details</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800">&times;</button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-400/15 text-lg font-semibold text-teal-100 ring-1 ring-teal-300/25">
              {getInitials(patient)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-xl text-white">{patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()}</h4>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-mono text-slate-300">{patient.patientId || patient.patientCode || '-'}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{typeof patient.age === 'number' ? patient.age : '-'} • {patient.gender || 'Other'} • {patient.bloodGroup || '—'}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
            <div><span className="text-slate-400">Phone:</span> <span className="text-white">{patient.phone || patient.contact?.phone || '-'}</span></div>
            <div><span className="text-slate-400">Email:</span> <span className="text-white">{patient.email || patient.contact?.email || '-'}</span></div>
            <div><span className="text-slate-400">Address:</span> <span className="text-white">{patient.address?.street || patient.address?.line1 || '-'}{patient.address?.city ? `, ${patient.address.city}` : ''}</span></div>
            <div><span className="text-slate-400">Status:</span> <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusBadgeClass[patient.status] || statusBadgeClass.Inactive}`}>{patient.status || 'Inactive'}</span></div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Medical Notes</p>
            <p className="mt-2 text-sm text-slate-200">{patient.medicalNotes || patient.medical?.notes || 'No medical notes provided.'}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Account Details</p>
            <div className="mt-2 text-sm text-slate-200">
              <span className="text-slate-400">Portal Access:</span>{' '}
              {patient.userId || patient.portalAccessStatus === 'pending' ? (
                <PortalStatusBadge patient={patient} />
              ) : (
                <>
                  <PortalStatusBadge patient={patient} />
                  {typeof onCreateLogin === 'function' ? (
                    <div className="mt-2">
                      <button type="button" onClick={() => onCreateLogin(patient)} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-1.5 text-xs text-teal-100 transition hover:bg-teal-400/20">
                        Create Login Account →
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPortalRequestForm((prev) => !prev);
                      setPortalEmail(patient.portalAccessEmail || patient.email || patient.contact?.email || '');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      background: 'rgba(13,148,136,0.1)',
                      border: '1px solid rgba(13,148,136,0.2)',
                      borderRadius: 8,
                      color: '#0d9488',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      width: '100%',
                      justifyContent: 'center',
                      marginTop: 8,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                    Request Portal Access
                  </button>
                  {showPortalRequestForm ? (
                    <div className="mt-2 space-y-2 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <input
                        type="email"
                        value={portalEmail}
                        onChange={(e) => setPortalEmail(e.target.value)}
                        placeholder="patient@email.com"
                        className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={requestingPortalAccess}
                        onClick={() => typeof onRequestPortalAccess === 'function' && onRequestPortalAccess(patient, portalEmail, () => setShowPortalRequestForm(false))}
                        className="w-full rounded-md bg-teal-500 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-50"
                      >
                        {requestingPortalAccess ? 'Submitting...' : 'Submit Portal Request'}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400">
            <p>Registered on: {patient.createdAt ? formatDate(patient.createdAt) : '-'}</p>
            <div className="flex gap-2">
              <button type="button" onClick={onEdit} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-amber-100">Edit</button>
              {showArchive ? <button type="button" onClick={onArchive} className="rounded-md border border-rose-300/30 px-3 py-1.5 text-rose-100">Archive</button> : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default PatientDetailDrawer;
