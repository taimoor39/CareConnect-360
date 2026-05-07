import { useMemo } from 'react';

const roles = ['admin', 'doctor', 'receptionist', 'patient'];

const getStrength = (password) => {
  const value = String(password || '');
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;

  if (score <= 2) return { label: 'Weak', width: '33%', color: 'bg-rose-400' };
  if (score === 3) return { label: 'Fair', width: '66%', color: 'bg-amber-400' };
  return { label: 'Strong', width: '100%', color: 'bg-emerald-400' };
};

function CreateUserForm({ form, errors, onChange, onSubmit, saving, firstErrorRef, onConfirmBlur, embedded = false }) {
  const passwordStrength = useMemo(() => getStrength(form.password), [form.password]);

  return (
    <article className={embedded ? '' : 'glass-panel rounded-2xl p-5'}>
      {!embedded ? <h2 className="font-display text-lg text-white">New User</h2> : null}

      <form className={`${embedded ? '' : 'mt-3'} grid gap-2.5`} onSubmit={onSubmit}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <input ref={firstErrorRef.firstName} name="firstName" value={form.firstName} onChange={onChange} placeholder="First Name *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
            {errors.firstName ? <p className="mt-1 text-[11px] text-rose-300">{errors.firstName}</p> : null}
          </div>
          <div>
            <input ref={firstErrorRef.lastName} name="lastName" value={form.lastName} onChange={onChange} placeholder="Last Name *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
            {errors.lastName ? <p className="mt-1 text-[11px] text-rose-300">{errors.lastName}</p> : null}
          </div>
          <div>
            <input ref={firstErrorRef.email} name="email" value={form.email} onChange={onChange} placeholder="Email *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
            {errors.email ? <p className="mt-1 text-[11px] text-rose-300">{errors.email}</p> : null}
          </div>
          <div>
            <input ref={firstErrorRef.phone} name="phone" value={form.phone} onChange={onChange} placeholder="Phone *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
            {errors.phone ? <p className="mt-1 text-[11px] text-rose-300">{errors.phone}</p> : null}
          </div>
          <div>
            <input ref={firstErrorRef.password} type="password" name="password" value={form.password} onChange={onChange} placeholder="Password *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
            {errors.password ? <p className="mt-1 text-[11px] text-rose-300">{errors.password}</p> : null}
            <div className="mt-1 h-1.5 rounded bg-slate-800">
              <div className={`h-full rounded ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{passwordStrength.label}</p>
          </div>
          <div>
            <input ref={firstErrorRef.confirmPassword} type="password" name="confirmPassword" value={form.confirmPassword} onChange={onChange} onBlur={onConfirmBlur} placeholder="Confirm Password *" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
            {errors.confirmPassword ? <p className="mt-1 text-[11px] text-rose-300">{errors.confirmPassword}</p> : null}
          </div>
          <div>
            <select ref={firstErrorRef.role} name="role" value={form.role} onChange={onChange} className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs">
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            {errors.role ? <p className="mt-1 text-[11px] text-rose-300">{errors.role}</p> : null}
            {form.role === 'patient' ? (
              <p className="mt-1 text-[11px] text-sky-300">A Patient record will be auto-created and linked to this account.</p>
            ) : null}
            {form.role === 'doctor' ? (
              <p className="mt-1 text-[11px] text-sky-300">A Doctor profile will be created. Complete it in Doctors &amp; Staff.</p>
            ) : null}
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-70">
          {saving ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </article>
  );
}

export default CreateUserForm;
