import mongoose from 'mongoose';

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
    consultationNotes: { type: String, trim: true, maxlength: 5000, required: true },
    followUpDate: { type: Date, default: null },
    isDraft: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Consultation', consultationSchema);

