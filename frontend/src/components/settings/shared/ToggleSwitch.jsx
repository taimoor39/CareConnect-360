function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? 'bg-teal-500/70' : 'bg-slate-700'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export default ToggleSwitch;
