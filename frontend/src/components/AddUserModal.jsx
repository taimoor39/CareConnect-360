import CreateUserForm from './CreateUserForm.jsx';
import CareModal from '@/shared/components/CareModal.jsx';

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
  return (
    <CareModal open={open} onClose={onClose} title="Add new user" size="wide">
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
    </CareModal>
  );
}

export default AddUserModal;
