import mongoose from 'mongoose';

const medicalReportSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null, index: true },
    title: { type: String, trim: true, required: true, maxlength: 200 },
    fileType: { type: String, enum: ['text', 'pdf'], default: 'text', index: true },
    originalText: { type: String, trim: true, default: '' },
    pdfName: { type: String, trim: true, default: '' },
    pdfMimeType: { type: String, trim: true, default: '' },
    pdfSizeBytes: { type: Number, default: 0 },
    pdfBase64: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('MedicalReport', medicalReportSchema);

