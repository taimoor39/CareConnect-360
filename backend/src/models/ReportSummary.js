import mongoose from 'mongoose';

const reportSummarySchema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalReport', required: true, unique: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    originalText: { type: String, default: '' },
    simplifiedSummary: { type: String, required: true },
    status: { type: String, enum: ['Not Generated', 'Pending Approval', 'Approved', 'Rejected'], default: 'Pending Approval', index: true },
    aiModelUsed: { type: String, default: 'facebook/bart-large-cnn' },
    generationTimeMs: { type: Number, default: 0 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    editedByDoctor: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('ReportSummary', reportSummarySchema);

