import CareModal from '@/shared/components/CareModal.jsx';
import { formatDateInPakistan } from '../../utils/isoDate.js';

function QRSuccessModal({ open, appointmentData, onClose }) {
  if (!open || !appointmentData) return null;
  const appointment = appointmentData.appointment || {};

  return (
    <CareModal
      open={open}
      onClose={onClose}
      title="Appointment booked!"
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              if (!appointmentData.qrCodeImage) return;
              const link = document.createElement('a');
              link.download = `appointment-${appointment._id}.png`;
              link.href = appointmentData.qrCodeImage;
              link.click();
            }}
            className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 transition hover:bg-slate-800"
          >
            Download QR
          </button>
          <button type="button" onClick={onClose} className="care-btn-primary h-9 px-4">
            Done
          </button>
        </>
      }
    >
      <div className="text-center">
        {appointmentData.qrCodeImage ? (
          <img src={appointmentData.qrCodeImage} alt="Appointment QR Code" className="mx-auto h-[200px] w-[200px] rounded bg-white p-2" />
        ) : null}
        <div className="mt-3 text-xs text-[var(--text-secondary)]">
          <p>Patient: {appointment.patientId?.name || '—'}</p>
          <p>Doctor: Dr. {appointment.doctorId?.name || '—'}</p>
          <p>Date: {appointment.date ? formatDateInPakistan(appointment.date) : '—'}</p>
          <p>Time: {appointment.timeSlot || '—'}</p>
        </div>
      </div>
    </CareModal>
  );
}

export default QRSuccessModal;
