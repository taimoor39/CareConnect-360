const roleBadgeClass = {
  admin: 'bg-rose-500/15 text-rose-200',
  doctor: 'bg-sky-500/15 text-sky-200',
  receptionist: 'bg-amber-500/15 text-amber-200',
  patient: 'bg-emerald-500/15 text-emerald-200',
};

function UserTable({ users, loading, onRefresh, onEdit, onToggleStatus }) {
  return (
    <article className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="font-display text-xl text-white">User Management</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900"
        >
          Refresh
        </button>
      </div>

      <div className="relative overflow-x-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
            <svg
              className="h-6 w-6 animate-spin text-teal-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}

        <table className="min-w-full table-fixed text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="w-[90px] px-4 py-3">Code</th>
              <th className="w-[180px] px-4 py-3">Name</th>
              <th className="w-[220px] px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && users.length === 0 ? (
              <tr className="border-b border-slate-800/60">
                <td colSpan="6" className="px-4 py-4 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user._id}
                  className="border-b border-slate-800/60 odd:bg-white/5 hover:bg-slate-900/70"
                >
                  <td className="px-4 py-3">{String(user._id).slice(-6).toUpperCase()}</td>
                  <td className="truncate px-4 py-3">{user.name}</td>
                  <td className="truncate px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 ${roleBadgeClass[user.role] || 'bg-slate-700 text-slate-100'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={user.isActive ? 'text-emerald-300' : 'text-rose-300'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(user)}
                      className="mr-2 rounded-md border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleStatus(user)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                        user.isActive
                          ? 'border-rose-300/30 bg-rose-400/10 text-rose-100'
                          : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
        Showing {users.length} users
      </div>
    </article>
  );
}

export default UserTable;
