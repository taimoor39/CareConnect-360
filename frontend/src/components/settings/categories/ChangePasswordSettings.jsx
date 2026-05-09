import { Link } from 'react-router-dom';

import { PasswordInput } from '@/shared/components/PasswordField.jsx';

import SettingsField from '../shared/SettingsField.jsx';
import SettingsSection from '../shared/SettingsSection.jsx';

function strength(newPassword) {
  let score = 0;
  if (newPassword.length >= 8) score += 1;
  if (/[A-Z]/.test(newPassword)) score += 1;
  if (/[0-9]/.test(newPassword)) score += 1;
  if (score <= 1) return { label: 'Weak', width: '33%', tone: 'bg-rose-500' };
  if (score === 2) return { label: 'Fair', width: '66%', tone: 'bg-amber-500' };
  return { label: 'Strong', width: '100%', tone: 'bg-emerald-500' };
}

function ChangePasswordSettings({ data, errors, saving, onChange, onSubmit, admin }) {
  const s = strength(data.newPassword || '');
  const matches = data.confirmPassword && data.confirmPassword === data.newPassword;
  return (
    <SettingsSection title="Change Password" subtitle="Update your admin account password">
      <div className="max-w-lg space-y-2">
        <SettingsField label="Current Password" error={errors.currentPassword}>
          <PasswordInput
            autoComplete="current-password"
            value={data.currentPassword}
            onChange={(e) => onChange({ ...data, currentPassword: e.target.value })}
            size="compact"
            inputClassName="bg-slate-900/80"
          />
        </SettingsField>
        <SettingsField label="New Password" error={errors.newPassword}>
          <PasswordInput
            autoComplete="new-password"
            value={data.newPassword}
            onChange={(e) => onChange({ ...data, newPassword: e.target.value })}
            size="compact"
            inputClassName="bg-slate-900/80"
          />
        </SettingsField>
        <div className="h-1 overflow-hidden rounded bg-slate-800"><div className={`h-full ${s.tone}`} style={{ width: s.width }} /></div>
        <p className="text-[11px] text-slate-400">{s.label}</p>
        <SettingsField label="Confirm New Password" error={errors.confirmPassword}>
          <PasswordInput
            autoComplete="new-password"
            value={data.confirmPassword}
            onChange={(e) => onChange({ ...data, confirmPassword: e.target.value })}
            size="compact"
            inputClassName="bg-slate-900/80"
          />
        </SettingsField>
        {data.confirmPassword ? <p className={`text-[11px] ${matches ? 'text-emerald-300' : 'text-rose-300'}`}>{matches ? 'Passwords match' : 'Passwords do not match'}</p> : null}
        <button type="button" onClick={onSubmit} disabled={saving || !data.currentPassword || !data.newPassword || !matches} className="w-full rounded-lg border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 disabled:opacity-50">{saving ? 'Changing...' : 'Change Password'}</button>
      </div>

      <div className="mt-4 max-w-lg rounded-lg border border-slate-700 bg-slate-900/40 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/30 text-sm font-semibold text-teal-100">{String(admin.name).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div>
            <p className="text-sm text-white">{admin.name}</p>
            <p className="text-xs text-slate-400">{admin.email || 'Not available'}</p>
            <span className="mt-1 inline-flex rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-100">ADMIN</span>
          </div>
        </div>
        <Link to="/users" className="mt-2 inline-block text-xs text-teal-200">Edit Profile →</Link>
      </div>
    </SettingsSection>
  );
}

export default ChangePasswordSettings;
