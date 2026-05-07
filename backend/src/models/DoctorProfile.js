import mongoose from 'mongoose';

const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    specialization: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    qualification: {
      type: String,
      default: '',
      trim: true,
    },
    schedule: {
      days: {
        type: [String],
        enum: validDays,
        default: [],
      },
      shiftStart: {
        type: String,
        default: '',
      },
      shiftEnd: {
        type: String,
        default: '',
      },
      maxPatientsPerDay: {
        type: Number,
        default: 20,
        min: 1,
        max: 100,
      },
      consultationDurationMins: {
        type: Number,
        default: 30,
        min: 10,
        max: 120,
      },
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('DoctorProfile', doctorProfileSchema);
