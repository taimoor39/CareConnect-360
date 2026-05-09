import { useState } from 'react';
import { toast } from 'react-toastify';

import CareModal from '@/shared/components/CareModal.jsx';
import { PasswordInput } from '@/shared/components/PasswordField.jsx';

const roles = ['admin', 'doctor', 'receptionist', 'patient'];

const inputClass = 'h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20';

function EditUserModal({
  open,
  form,
  errors,
  saving,
  onClose,
  onChange,
  onSubmit,
  onSendResetEmail,
  onSetTempPassword,
}) {
  const [sendingReset, setSendingReset] = useState(false);
  const [tempOpen, setTempOpen] = useState(false);
  const [tempPw, setTempPw] = useState('');
  const [settingTemp, setSettingTemp] = useState(false);

  const sendReset = async () => {
    if (!onSendResetEmail) return;
    setSendingReset(true);
    try {
      await onSendResetEmail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setSendingReset(false);
    }
  };

  const submitTemp = async () => {
    if (!tempPw.trim() || !onSetTempPassword) return;
    setSettingTemp(true);
    try {
      await onSetTempPassword(tempPw);
      setTempOpen(false);
      setTempPw('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set password');
    } finally {
      setSettingTemp(false);
    }
  };

  return (
    <CareModal open={open} onClose={onClose} title="Edit user" size="wide">
      {form.originalEmail && form.email !== form.originalEmail ? (
        <p className="mb-4 text-[0.6875rem] text-amber-200">Changing email will require re-verification.</p>
      ) : null}
      <form onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <input name="firstName" value={form.firstName} onChange={onChange} placeholder="First Name *" className={inputClass} />
              {errors.firstName ? <p className="mt-1 text-[11px] text-rose-300">{errors.firstName}</p> : null}
            </div>
            <div>
              <input name="lastName" value={form.lastName} onChange={onChange} placeholder="Last Name *" className={inputClass} />
              {errors.lastName ? <p className="mt-1 text-[11px] text-rose-300">{errors.lastName}</p> : null}
            </div>
            <div>
              <input name="email" value={form.email} onChange={onChange} placeholder="Email *" className={inputClass} />
              {errors.email ? <p className="mt-1 text-[11px] text-rose-300">{errors.email}</p> : null}
            </div>
            <div>
              <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone *" className={inputClass} />
              {errors.phone ? <p className="mt-1 text-[11px] text-rose-300">{errors.phone}</p> : null}
            </div>
            <div>
              <select name="role" value={form.role} onChange={onChange} className={inputClass}>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <PasswordInput
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={onChange}
                placeholder="New Password (optional)"
                size="sm"
                inputClassName={`${inputClass} !border-slate-700 !bg-slate-900/80 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20`}
              />
              {errors.password ? <p className="mt-1 text-[11px] text-rose-300">{errors.password}</p> : null}
            </div>
            {form.role === 'doctor' ? (
              <>
                <div>
                  <input name="specialization" value={form.specialization} onChange={onChange} placeholder="Specialization *" className={inputClass} />
                  {errors.specialization ? <p className="mt-1 text-[11px] text-rose-300">{errors.specialization}</p> : null}
                </div>
                <div>
                  <input name="qualification" value={form.qualification} onChange={onChange} placeholder="Qualification" className={inputClass} />
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">RESET USER PASSWORD</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sendReset}
                disabled={sendingReset}
                className="rounded-lg border border-sky-500/50 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/10 disabled:opacity-50"
              >
                {sendingReset ? 'Sending…' : 'Send Password Reset Email'}
              </button>
              <button
                type="button"
                onClick={() => setTempOpen((o) => !o)}
                className="rounded-lg border border-amber-500/50 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/10"
              >
                Set Temporary Password
              </button>
            </div>
            {tempOpen ? (
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                <label className="block text-[11px] text-slate-400">
                  New Password
                  <PasswordInput
                    autoComplete="new-password"
                    value={tempPw}
                    onChange={(e) => setTempPw(e.target.value)}
                    className="mt-1"
                    size="sm"
                    inputClassName={`${inputClass} focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20`}
                    placeholder="Temporary password"
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={settingTemp || !tempPw.trim()}
                    onClick={submitTemp}
                    className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-50"
                  >
                    {settingTemp ? 'Setting…' : 'Set Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTempOpen(false); setTempPw(''); }}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">
              Prefer sending a reset email for security. Only use temporary password if email is unavailable.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 transition hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
    </CareModal>
  );
}

export default EditUserModal;
