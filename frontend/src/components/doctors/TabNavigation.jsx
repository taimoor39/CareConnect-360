function TabNavigation({ activeTab, onTabChange, doctorCount = 0, receptionistCount = 0 }) {
  const tabs = [
    { key: 'doctors', label: `Doctors (${doctorCount})` },
    { key: 'receptionists', label: `Receptionists (${receptionistCount})` },
  ];

  return (
    <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/70 p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              isActive ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default TabNavigation;
