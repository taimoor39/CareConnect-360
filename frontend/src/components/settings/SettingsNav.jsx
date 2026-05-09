import UnsavedBadge from './shared/UnsavedBadge.jsx';

function SettingsNav({ categories, activeCategory, onSelect, isCategoryDirty }) {
  return (
    <aside className="glass-panel h-fit rounded-xl p-2">
      {categories.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
            activeCategory === item.key ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30' : 'text-slate-300 hover:bg-slate-800/70'
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex shrink-0 items-center justify-center text-current [&_svg]:block">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </span>
          <UnsavedBadge show={isCategoryDirty(item.key)} />
        </button>
      ))}
    </aside>
  );
}

export default SettingsNav;
