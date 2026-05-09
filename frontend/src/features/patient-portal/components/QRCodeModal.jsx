import CareModal from '@/shared/components/CareModal.jsx';
import { formatDate, formatTimeSlot } from '@/utils/dateHelpers.js';

function QRCodeModal({ open, appointment, onClose }) {
  if (!open || !appointment) return null;

  const img = appointment.qrCodeImage;
  const doctor = appointment.doctorId;
  const spec = appointment.doctorProfile?.specialization || doctor?.specialization || '';

  const downloadPng = () => {
    if (!img) return;
    const link = document.createElement('a');
    link.href = img;
    link.download = `appointment-qr-${appointment._id}.png`;
    link.click();
  };

  return (
    <CareModal
      open={open}
      onClose={onClose}
      title="Your appointment QR code"
      footer={
        <>
          {img ? (
            <button type="button" onClick={downloadPng} className="care-btn-primary">
              Download QR
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)]">
            Close
          </button>
        </>
      }
    >
      <div className="flex justify-center">
        {img ? (
          <img src={img} alt="Appointment QR code" className="h-[300px] w-[300px] rounded-lg border border-[var(--border)] bg-white p-2" />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">QR image not available. Contact reception.</p>
        )}
      </div>
      <div className="mt-4 space-y-1 text-center text-sm text-[var(--text-secondary)]">
        <p>
          <span className="text-[var(--text-muted)]">Date: </span>
          {formatDate(appointment.date)}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Time: </span>
          {formatTimeSlot(appointment.timeSlot)}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Doctor: </span>
          Dr. {doctor?.name || '—'}
          {spec ? ` — ${spec}` : ''}
        </p>
      </div>
      <div className="mt-5 rounded-[var(--radius-md)] border border-teal-500/35 bg-teal-500/[0.07] p-4 text-sm leading-relaxed text-teal-50/95">
        Show this QR code to the receptionist when you arrive for your appointment. It will be scanned for automatic check-in.
      </div>
    </CareModal>
  );
}

export default QRCodeModal;
