import mongoose from 'mongoose';

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: { type: String, trim: true, required: true, maxlength: 200 },
    dosage: { type: String, trim: true, required: true, maxlength: 100 },
    frequency: {
      type: String,
      required: true,
      enum: ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Other'],
    },
    duration: { type: String, trim: true, required: true, maxlength: 100 },
    instructions: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const reportSummarySchema = new mongoose.Schema(
  {
    simplifiedSummary: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Not Generated', 'Pending Approval', 'Approved', 'Rejected'],
      default: 'Not Generated',
    },
    aiModelUsed: { type: String, default: 'facebook/bart-large-cnn' },
    generationTimeMs: { type: Number, default: 0 },
    generatedAtPKT: { type: String, default: '' },
    chunksProcessed: { type: Number, default: 1 },
    originalWords: { type: Number, default: 0 },
    summaryWords: { type: Number, default: 0 },
    replacementsMade: {
      type: [
        {
          original: { type: String, default: '' },
          replacement: { type: String, default: '' },
        },
      ],
      default: [],
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    editedByDoctor: { type: Boolean, default: false },
  },
  { _id: false },
);

const medicalReportSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 200, default: '' },
    fileType: { type: String, enum: ['text', 'pdf'], default: 'text' },
    originalText: { type: String, trim: true, default: '' },
    pdfName: { type: String, trim: true, default: '' },
    pdfMimeType: { type: String, trim: true, default: '' },
    pdfSizeBytes: { type: Number, default: 0 },
    pdfBase64: { type: String, default: '' },
    uploadedAt: { type: Date, default: null },
    summary: { type: reportSummarySchema, default: () => ({ status: 'Not Generated' }) },
  },
  { _id: false },
);

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    symptoms: { type: String, trim: true, maxlength: 2000, default: '' },
    diagnosis: { type: String, trim: true, maxlength: 2000, default: '' },
    consultationNotes: { type: String, trim: true, maxlength: 5000, default: '' },
    followUpDate: { type: Date, default: null },
    isDraft: { type: Boolean, default: true, index: true },
    prescription: {
      items: { type: [prescriptionItemSchema], default: [] },
    },
    medicalReport: { type: medicalReportSchema, default: null },
  },
  { timestamps: true },
);

consultationSchema.index({ doctorId: 1, 'medicalReport.summary.status': 1 });

export default mongoose.model('Consultation', consultationSchema);
