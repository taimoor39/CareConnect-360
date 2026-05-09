import { useEffect, useState } from 'react';
import DateDropdown from '../ui/DateDropdown.jsx';
import PortalAccessToggle from '../portalAccess/PortalAccessToggle.jsx';
import { normalizeISODateInput, toISOInputValue } from '../../utils/isoDate.js';
import usePatientForm, { defaultPatientForm } from '../../hooks/usePatientForm.js';

function EditPatientModal({ open, patient, onClose, onSubmit, saving, serverErrors = {} }) {
  const form = usePatientForm(defaultPatientForm);
  const [requestPortalAccess, setRequestPortalAccess] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalEmailError, setPortalEmailError] = useState('');

  useEffect(() => {
    if (!open || !patient) return;
    form.reset({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      dateOfBirth: patient.dateOfBirth ? normalizeISODateInput(patient.dateOfBirth) : '',
      gender: patient.gender || '',
      phone: patient.phone || patient.contact?.phone || '',
      email: patient.email || patient.contact?.email || '',
      bloodGroup: patient.bloodGroup || '',
      status: patient.status || 'Active',
      addressStreet: patient.address?.street || patient.address?.line1 || '',
      city: patient.address?.city || '',
      medicalNotes: patient.medicalNotes || patient.medical?.notes || '',
    });
    if (patient.portalAccessStatus === 'pending') {
      setRequestPortalAccess(true);
      setPortalEmail(patient.portalAccessEmail || patient.email || '');
    } else {
      setRequestPortalAccess(false);
      setPortalEmail(patient.portalAccessEmail || patient.email || '');
    }
    setPortalEmailError('');
  }, [open, patient]);

  useEffect(() => {
    if (requestPortalAccess && form.formData.email && !portalEmail) {
      setPortalEmail(String(form.formData.email || '').trim());
    }
  }, [requestPortalAccess, form.formData.email, portalEmail]);

  if (!open || !patient) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.validateAll()) return;
    const canRequestPortalAccess = !patient?.userId && patient?.portalAccessStatus !== 'pending';
    if (requestPortalAccess && canRequestPortalAccess) {
      if (!portalEmail) {
        setPortalEmailError('Email required for portal access');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portalEmail)) {
        setPortalEmailError('Enter a valid email address');
        return;
      }
    }

    const ok = await onSubmit?.(form.formData, {
      setErrors: form.setErrors,
      setPortalAccessError: setPortalEmailError,
      portalAccess: requestPortalAccess && canRequestPortalAccess
        ? { requested: true, email: portalEmail.trim().toLowerCase() }
        : { requested: false, email: '' },
    });

    if (ok) {
      onClose?.();
    }
  };

  const error = (name) => form.errors[name] || serverErrors[name] || '';
  const canRequestPortalAccess = !patient?.userId && patient?.portalAccessStatus !== 'pending';

  return (
    <div className="care-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="care-modal-panel care-modal-panel--xl" onClick={(e) => e.stopPropagation()}>
        <header className="care-modal-header">
          <h2 className="care-modal-title">
            Edit patient — {(patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`).trim()}
          </h2>
          <button type="button" className="care-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="care-modal-body" style={{ maxHeight: 'min(70vh, calc(90vh - 140px))', overflowY: 'auto' }}>
            <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
              Patient Code: <span className="font-mono text-slate-100">{patient.patientId || patient.patientCode || '-'}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
            <div>
              <input ref={(node) => form.registerFieldRef('firstName', node)} value={form.formData.firstName} onChange={(e) => form.handleChange('firstName', e.target.value)} onBlur={() => form.handleBlur('firstName')} placeholder="First Name *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
              {error('firstName') ? <p className="mt-1 text-[11px] text-rose-300">{error('firstName')}</p> : null}
            </div>
            <div>
              <input ref={(node) => form.registerFieldRef('lastName', node)} value={form.formData.lastName} onChange={(e) => form.handleChange('lastName', e.target.value)} onBlur={() => form.handleBlur('lastName')} placeholder="Last Name *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
              {error('lastName') ? <p className="mt-1 text-[11px] text-rose-300">{error('lastName')}</p> : null}
            </div>
            <div>
              <DateDropdown
                value={form.formData.dateOfBirth}
                onChange={(iso) => { form.handleChange('dateOfBirth', iso); form.handleBlur('dateOfBirth'); }}
                maxDate={toISOInputValue(new Date())}
                yearFrom={1900}
                yearTo={new Date().getFullYear()}
                placeholder={['Day', 'Month', 'Year']}
              />
              {form.agePreview ? <p className="mt-1 text-[11px] text-teal-300">{form.agePreview}</p> : null}
              {error('dateOfBirth') ? <p className="mt-1 text-[11px] text-rose-300">{error('dateOfBirth')}</p> : null}
            </div>
            <div>
              <select ref={(node) => form.registerFieldRef('gender', node)} value={form.formData.gender} onChange={(e) => form.handleChange('gender', e.target.value)} onBlur={() => form.handleBlur('gender')} className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs">
                <option value="">Select Gender *</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {error('gender') ? <p className="mt-1 text-[11px] text-rose-300">{error('gender')}</p> : null}
            </div>
            <div>
              <input ref={(node) => form.registerFieldRef('phone', node)} value={form.formData.phone} onChange={(e) => form.handleChange('phone', e.target.value)} onBlur={() => form.handleBlur('phone')} placeholder="Phone *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
              {error('phone') ? <p className="mt-1 text-[11px] text-rose-300">{error('phone')}</p> : null}
            </div>
            <div>
              <input ref={(node) => form.registerFieldRef('email', node)} value={form.formData.email} onChange={(e) => form.handleChange('email', e.target.value)} onBlur={() => form.handleBlur('email')} placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
              {error('email') ? <p className="mt-1 text-[11px] text-rose-300">{error('email')}</p> : null}
            </div>
            <select ref={(node) => form.registerFieldRef('bloodGroup', node)} value={form.formData.bloodGroup} onChange={(e) => form.handleChange('bloodGroup', e.target.value)} onBlur={() => form.handleBlur('bloodGroup')} className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs">
              <option value="">Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
            <select value={form.formData.status} onChange={(e) => form.handleChange('status', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discharged">Discharged</option>
            </select>
            <input value={form.formData.addressStreet} onChange={(e) => form.handleChange('addressStreet', e.target.value)} placeholder="Address - Street" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
            <input value={form.formData.city} onChange={(e) => form.handleChange('city', e.target.value)} placeholder="Address - City" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
          </div>

            <textarea value={form.formData.medicalNotes} onChange={(e) => form.handleChange('medicalNotes', e.target.value)} rows="3" placeholder="Medical Notes" className="col-span-full w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />

            <div className="col-span-full" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {!canRequestPortalAccess ? (
                <div className={`rounded-lg border px-3 py-2 text-xs ${patient?.userId ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/30 bg-amber-500/10 text-amber-200'}`}>
                  {patient?.userId ? 'Patient already has portal access.' : 'Portal access request is already pending admin approval.'}
                </div>
              ) : (
                <>
                  <PortalAccessToggle
                    requestPortalAccess={requestPortalAccess}
                    setRequestPortalAccess={setRequestPortalAccess}
                    portalEmail={portalEmail}
                    setPortalEmail={setPortalEmail}
                    portalEmailError={portalEmailError}
                    setPortalEmailError={setPortalEmailError}
                  />
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 transition hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving || form.requiredMissing} className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-50">
              {saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" /> : null}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPatientModal;
