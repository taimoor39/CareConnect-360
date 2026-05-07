import SettingsField from '../shared/SettingsField.jsx';
import SettingsSection from '../shared/SettingsSection.jsx';

function ClinicSettings({ data, errors, dirty, saving, onChange, onSave, onLogoChange, onRemoveLogo }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <SettingsSection title="Clinic Information" subtitle="Details used in invoices, emails, and patient portal">
      <div className="grid gap-3 md:grid-cols-2">
        {[
          ['name', 'Clinic Name'],
          ['tagline', 'Tagline'],
          ['phone', 'Phone Number'],
          ['email', 'Email Address'],
          ['website', 'Website URL'],
          ['registrationNumber', 'Registration Number'],
          ['currencySymbol', 'Currency Symbol'],
          ['invoicePrefix', 'Invoice Prefix'],
        ].map(([key, label]) => (
          <SettingsField key={key} label={label} error={errors[key]}>
            <input value={data?.[key] || ''} onChange={(e) => set(key, e.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" />
          </SettingsField>
        ))}
        <SettingsField label="Default Tax Rate (%)" error={errors.defaultTaxRate}>
          <input type="number" min={0} max={100} value={data?.defaultTaxRate ?? ''} onChange={(e) => set('defaultTaxRate', e.target.value)} onBlur={(e) => { const n = parseFloat(e.target.value); set('defaultTaxRate', isNaN(n) ? '' : n); }} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm" />
        </SettingsField>
      </div>
      <SettingsField label="Invoice Footer Note">
        <textarea rows={3} value={data?.invoiceFooterNote || ''} onChange={(e) => set('invoiceFooterNote', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm" />
      </SettingsField>

      <div className="mt-3 rounded-lg border border-slate-700 p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Clinic Working Hours</p>
        <div className="mt-2 space-y-2">
          {(data?.workingHours || []).map((row, idx) => (
            <div key={row.day || idx} className="grid items-center gap-2 md:grid-cols-[80px_90px_1fr_1fr]">
              <p className="text-xs text-slate-300">{row.day}</p>
              <label className="text-xs text-slate-300"><input type="checkbox" checked={Boolean(row.isOpen)} onChange={(e) => {
                const next = [...(data?.workingHours || [])];
                next[idx] = { ...next[idx], isOpen: e.target.checked };
                onChange({ ...data, workingHours: next });
              }} /> Open</label>
              <input type="time" disabled={!row.isOpen} value={row.start || '09:00'} onChange={(e) => {
                const next = [...(data?.workingHours || [])];
                next[idx] = { ...next[idx], start: e.target.value };
                onChange({ ...data, workingHours: next });
              }} className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs disabled:opacity-50" />
              <input type="time" disabled={!row.isOpen} value={row.end || '17:00'} onChange={(e) => {
                const next = [...(data?.workingHours || [])];
                next[idx] = { ...next[idx], end: e.target.value };
                onChange({ ...data, workingHours: next });
              }} className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs disabled:opacity-50" />
            </div>
          ))}
        </div>
        {errors.workingHours ? <p className="mt-2 text-[11px] text-rose-300">{errors.workingHours}</p> : null}
      </div>

      <div className="mt-3 rounded-lg border border-slate-700 p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Clinic Logo</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
            {data?.logoUrl ? <img src={data.logoUrl} alt="Clinic logo" className="h-full w-full object-cover" /> : <span className="text-xl text-teal-200">{(data?.name || 'CC').slice(0, 2).toUpperCase()}</span>}
          </div>
          <div className="space-y-2">
            <input type="file" accept=".png,.jpg,.jpeg" onChange={onLogoChange} className="text-xs text-slate-300" />
            {errors.logo ? <p className="text-[11px] text-rose-300">{errors.logo}</p> : null}
            {data?.logoUrl ? <button type="button" onClick={onRemoveLogo} className="rounded border border-rose-300/30 px-2 py-1 text-xs text-rose-200">Remove</button> : null}
          </div>
        </div>
      </div>

      <button type="button" onClick={onSave} disabled={!dirty || saving} className="mt-3 rounded border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100 disabled:opacity-50">{saving ? 'Saving...' : 'Save Clinic Settings'}</button>
    </SettingsSection>
  );
}

export default ClinicSettings;
