import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { updateStaff } from '../../api/staff.js';

const parseName = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

const initialState = { firstName: '', lastName: '', phone: '', notes: '', isActive: true };

function EditStaffModal({ staff, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !staff) return;
    const parsed = parseName(staff.name);
    setFormData({
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: staff.phone || '',
      notes: staff.notes || '',
      isActive: Boolean(staff.isActive),
    });
    setErrors({});
    setTouched({});
  }, [isOpen, staff]);

  const validators = useMemo(() => ({
    firstName: (value) => {
      if (!value.trim()) return 'First name is required';
      if (value.trim().length < 2) return '2–30 characters';
      if (!/^[a-zA-Z\s]+$/.test(value.trim())) return 'Letters only';
      return '';
    },
    lastName: (value) => {
      if (!value.trim()) return 'Last name is required';
      if (value.trim().length < 2) return '2–30 characters';
      return '';
    },
    phone: (value) => {
      if (!value.trim()) return 'Phone is required';
      if (!/^[0-9]{10,15}$/.test(value.trim())) return '10–15 digits only';
      return '';
    },
  }), []);

  const validateField = (field, value) => validators[field]?.(value) || '';

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const message = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const validateAll = () => {
    const nextErrors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      phone: validateField('phone', formData.phone),
    };
    setErrors(nextErrors);
    setTouched({ firstName: true, lastName: true, phone: true });
    return Object.values(nextErrors).every((value) => !value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateAll()) return;

    try {
      setSaving(true);
      await updateStaff(staff._id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim(),
        isActive: formData.isActive,
      });
      toast.success(`${staff.name} has been updated successfully`);
      onClose();
      if (typeof onSuccess === 'function') await onSuccess();
    } catch (error) {
      const apiErrors = error.response?.data?.errors || [];
      if (apiErrors.length) {
        const mapped = {};
        apiErrors.forEach((item) => {
          mapped[item.field] = item.message;
        });
        setErrors((prev) => ({ ...prev, ...mapped }));
      } else {
        toast.error(error.response?.data?.message || 'Server error — please try again');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <h3 className="font-display text-xl text-white">Edit Staff — {staff.name}</h3>

        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <input
                value={formData.firstName}
                onChange={(event) => setFormData((prev) => ({ ...prev, firstName: event.target.value }))}
                onBlur={() => handleBlur('firstName')}
                placeholder="First Name *"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
              />
              {touched.firstName && errors.firstName ? <p className="mt-1 text-[11px] text-rose-300">{errors.firstName}</p> : null}
            </div>
            <div>
              <input
                value={formData.lastName}
                onChange={(event) => setFormData((prev) => ({ ...prev, lastName: event.target.value }))}
                onBlur={() => handleBlur('lastName')}
                placeholder="Last Name *"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
              />
              {touched.lastName && errors.lastName ? <p className="mt-1 text-[11px] text-rose-300">{errors.lastName}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <input
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                onBlur={() => handleBlur('phone')}
                placeholder="Phone *"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
              />
              {touched.phone && errors.phone ? <p className="mt-1 text-[11px] text-rose-300">{errors.phone}</p> : null}
            </div>
            <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
              <span>Status</span>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className={`rounded-full px-3 py-1 text-[11px] ${formData.isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-600 text-slate-200'}`}
              >
                {formData.isActive ? 'Active' : 'Inactive'}
              </button>
            </label>
          </div>

          <textarea
            rows="3"
            value={formData.notes}
            onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes (optional)"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Max 500 characters</span>
            <span>{formData.notes.length}/500</span>
          </div>
          {errors.notes ? <p className="text-[11px] text-rose-300">{errors.notes}</p> : null}

          <div className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-400">
            Email: <span className="text-slate-300">{staff.email}</span> (Edit in User Management)
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-70">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <p className="text-[11px] text-slate-400">To change email or password, use User Management</p>
        </form>
      </div>
    </div>
  );
}

export default EditStaffModal;
