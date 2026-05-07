import mongoose from 'mongoose';

const engagementLogSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    ruleId: {
      type: String,
      required: true,
      enum: ['ER-1', 'ER-2', 'ER-3', 'ER-4', 'ER-5'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'appointment_reminder',
        'missed_appointment',
        'prescription_renewal',
        're_engagement',
        'summary_available',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ['email', 'in_app'],
      default: 'email',
    },
    status: {
      type: String,
      enum: ['Sent', 'Failed', 'Pending'],
      default: 'Pending',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

engagementLogSchema.index({ triggeredAt: -1 });
engagementLogSchema.index({ patientId: 1, ruleId: 1, triggeredAt: -1 });

export default mongoose.model('EngagementLog', engagementLogSchema);
