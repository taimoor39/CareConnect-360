function SettingsField({ label, error = '', helper = '', children }) {
  return (
    <label className="block text-xs text-slate-300">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-[11px] text-rose-300">{error}</p> : null}
      {!error && helper ? <p className="mt-1 text-[11px] text-slate-500">{helper}</p> : null}
    </label>
  );
}

export default SettingsField;
