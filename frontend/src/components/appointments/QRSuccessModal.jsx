import { formatDateInPakistan } from '../../utils/isoDate.js';

function QRSuccessModal({ open, appointmentData, onClose }) {
  if (!open || !appointmentData) return null;

  const appointment = appointmentData.appointment || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">Appointment Booked!</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800">Close</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-center">
          {appointmentData.qrCodeImage ? (
            <img src={appointmentData.qrCodeImage} alt="Appointment QR Code" className="mx-auto h-[200px] w-[200px] rounded bg-white p-2" />
          ) : null}
          <div className="mt-3 text-xs text-slate-300">
            <p>Patient: {appointment.patientId?.name || '--'}</p>
            <p>Doctor: Dr. {appointment.doctorId?.name || '--'}</p>
            <p>Date: {appointment.date ? formatDateInPakistan(appointment.date) : '--'}</p>
            <p>Time: {appointment.timeSlot || '--'}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-slate-800 px-5 py-4">
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
          <button type="button" onClick={onClose} className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400">Done</button>
        </div>
      </div>
    </div>
  );
}

export default QRSuccessModal;
