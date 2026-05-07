function SettingsSection({ title, subtitle, children }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <h2 className="text-lg font-medium text-white">{title}</h2>
      {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default SettingsSection;
