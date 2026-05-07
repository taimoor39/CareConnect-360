import BookAppointmentModal from './BookAppointmentModal.jsx';

function RescheduleModal(props) {
  const { open, appointment } = props;
  if (!open || !appointment) return null;
  return <BookAppointmentModal {...props} />;
}

export default RescheduleModal;
