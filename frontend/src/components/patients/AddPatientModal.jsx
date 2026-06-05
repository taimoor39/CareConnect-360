import { useEffect, useState } from 'react';
import DateDropdown from '../ui/DateDropdown.jsx';
import PortalAccessToggle from '../portalAccess/PortalAccessToggle.jsx';
import { toISOInputValue } from '../../utils/isoDate.js';
import usePatientForm, { defaultPatientForm } from '../../hooks/usePatientForm.js';
import { formInputTextStyle } from '../../utils/formInputTextStyle.js';

const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs';

function AddPatientModal({ open, onClose, onSubmit, saving, serverErrors = {} }) {
  const form = usePatientForm(defaultPatientForm);
  const [requestPortalAccess, setRequestPortalAccess] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalEmailError, setPortalEmailError] = useState('');

  useEffect(() => {
    if (requestPortalAccess && form.formData.email) {
      setPortalEmail(String(form.formData.email || '').trim());
    }
  }, [requestPortalAccess, form.formData.email]);

  useEffect(() => {
    if (!open) {
      setRequestPortalAccess(false);
      setPortalEmail('');
      setPortalEmailError('');
    }
  }, [open]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.validateAll()) return;
    if (requestPortalAccess) {
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
      portalAccess: requestPortalAccess
        ? { requested: true, email: portalEmail.trim().toLowerCase() }
        : { requested: false, email: '' },
    });

    if (ok) {
      form.reset(defaultPatientForm);
      setRequestPortalAccess(false);
      setPortalEmail('');
      setPortalEmailError('');
      onClose?.();
    }
  };

  const error = (name) => form.errors[name] || serverErrors[name] || '';

  return (
    <div className="care-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="care-modal-panel care-modal-panel--xl" onClick={(e) => e.stopPropagation()}>
        <header className="care-modal-header">
          <h2 className="care-modal-title">Register new patient</h2>
          <button type="button" className="care-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="care-modal-body" style={{ maxHeight: 'min(70vh, calc(90vh - 140px))', overflowY: 'auto' }}>
            <div className="grid gap-3 md:grid-cols-2">
            <div>
              <input ref={(node) => form.registerFieldRef('firstName', node)} name="firstName" value={form.formData.firstName} onChange={(e) => form.handleChange('firstName', e.target.value)} onBlur={() => form.handleBlur('firstName')} placeholder="First Name *" className={fieldClass}
              style={formInputTextStyle} />
              {error('firstName') ? <p className="mt-1 text-[11px] text-rose-300">{error('firstName')}</p> : null}
            </div>
            <div>
              <input ref={(node) => form.registerFieldRef('lastName', node)} name="lastName" value={form.formData.lastName} onChange={(e) => form.handleChange('lastName', e.target.value)} onBlur={() => form.handleBlur('lastName')} placeholder="Last Name *" className={fieldClass}
              style={formInputTextStyle} />
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
              <select ref={(node) => form.registerFieldRef('gender', node)} value={form.formData.gender} onChange={(e) => form.handleChange('gender', e.target.value)} onBlur={() => form.handleBlur('gender')} className={fieldClass}
              style={formInputTextStyle}>
                <option value="">Select Gender *</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {error('gender') ? <p className="mt-1 text-[11px] text-rose-300">{error('gender')}</p> : null}
            </div>
            <div>
              <input ref={(node) => form.registerFieldRef('phone', node)} value={form.formData.phone} onChange={(e) => form.handleChange('phone', e.target.value)} onBlur={() => form.handleBlur('phone')} placeholder="Phone *" className={fieldClass}
              style={formInputTextStyle} />
              {error('phone') ? <p className="mt-1 text-[11px] text-rose-300">{error('phone')}</p> : null}
            </div>
            <div>
              <input ref={(node) => form.registerFieldRef('email', node)} value={form.formData.email} onChange={(e) => form.handleChange('email', e.target.value)} onBlur={() => form.handleBlur('email')} placeholder="Email" className={fieldClass}
              style={formInputTextStyle} />
              {error('email') ? <p className="mt-1 text-[11px] text-rose-300">{error('email')}</p> : null}
            </div>
            <select ref={(node) => form.registerFieldRef('bloodGroup', node)} value={form.formData.bloodGroup} onChange={(e) => form.handleChange('bloodGroup', e.target.value)} onBlur={() => form.handleBlur('bloodGroup')} className={fieldClass}
              style={formInputTextStyle}>
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
            <select value={form.formData.status} onChange={(e) => form.handleChange('status', e.target.value)} className={fieldClass}
              style={formInputTextStyle}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discharged">Discharged</option>
            </select>
            <input value={form.formData.addressStreet} onChange={(e) => form.handleChange('addressStreet', e.target.value)} placeholder="Address - Street" className={fieldClass}
              style={formInputTextStyle} />
            <input value={form.formData.city} onChange={(e) => form.handleChange('city', e.target.value)} placeholder="Address - City" className={fieldClass}
              style={formInputTextStyle} />
          </div>

            <textarea
              value={form.formData.medicalNotes}
              onChange={(e) => form.handleChange('medicalNotes', e.target.value)}
              rows="3"
              placeholder="Medical Notes"
              className={`col-span-full ${fieldClass}`}
              style={formInputTextStyle}
            />

            <div className="col-span-full">
              <PortalAccessToggle
                requestPortalAccess={requestPortalAccess}
                setRequestPortalAccess={setRequestPortalAccess}
                portalEmail={portalEmail}
                setPortalEmail={setPortalEmail}
                portalEmailError={portalEmailError}
                setPortalEmailError={setPortalEmailError}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 transition hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving || form.requiredMissing} className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-50">
              {saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" /> : null}
              {saving ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPatientModal;
