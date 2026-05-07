import mongoose from 'mongoose';

const medicalTermSchema = new mongoose.Schema(
  {
    medicalTerm: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    simplifiedTerm: {
      type: String,
      required: true,
      trim: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('MedicalTerm', medicalTermSchema);
