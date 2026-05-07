import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
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
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
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
    items: { type: [itemSchema], validate: [(arr) => arr.length > 0, 'At least one medicine required'] },
  },
  { timestamps: true }
);

export default mongoose.model('Prescription', prescriptionSchema);

