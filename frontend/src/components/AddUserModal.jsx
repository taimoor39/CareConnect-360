import CreateUserForm from './CreateUserForm.jsx';

function AddUserModal({
  open,
  onClose,
  form,
  errors,
  onChange,
  onSubmit,
  saving,
  firstErrorRef,
  onConfirmBlur,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">Add New User</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
          >
            &times;
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <CreateUserForm
            form={form}
            errors={errors}
            onChange={onChange}
            onSubmit={onSubmit}
            saving={saving}
            firstErrorRef={firstErrorRef}
            onConfirmBlur={onConfirmBlur}
            embedded
          />
        </div>
      </div>
    </div>
  );
}

export default AddUserModal;
