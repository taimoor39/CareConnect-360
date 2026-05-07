import { formatDate, formatTimeSlot } from '../../utils/dateHelpers.js';

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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <h2 id="qr-modal-title" className="text-lg font-semibold text-white">
          Your appointment QR code
        </h2>
        <div className="mt-6 flex justify-center">
          {img ? (
            <img src={img} alt="Appointment QR code" className="h-[300px] w-[300px] rounded-lg border border-slate-700 bg-white p-2" />
          ) : (
            <p className="text-sm text-slate-400">QR image not available. Contact reception.</p>
          )}
        </div>
        <div className="mt-4 space-y-1 text-center text-sm text-slate-300">
          <p>
            <span className="text-slate-500">Date: </span>
            {formatDate(appointment.date)}
          </p>
          <p>
            <span className="text-slate-500">Time: </span>
            {formatTimeSlot(appointment.timeSlot)}
          </p>
          <p>
            <span className="text-slate-500">Doctor: </span>
            Dr. {doctor?.name || '—'}
            {spec ? ` — ${spec}` : ''}
          </p>
        </div>
        <div className="mt-5 rounded-xl border border-teal-400/40 bg-teal-500/10 p-4 text-sm leading-relaxed text-teal-50/95">
          Show this QR code to the receptionist when you arrive for your appointment. It will be scanned for automatic check-in.
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {img ? (
            <button
              type="button"
              onClick={downloadPng}
              className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950"
            >
              Download QR
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRCodeModal;
