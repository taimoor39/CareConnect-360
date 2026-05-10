/**
 * Clinical patient chart (demographics, address, medical sketch, portal linkage).
 *
 * patientId / patientCode are human-readable identifiers; user/userId link an optional login.
 * Portal onboarding may set portalAccess* fields when requests are pending or approved.
 */
import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, default: '' },
    line1: { type: String, trim: true, default: '' },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    relation: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const insuranceSchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true, default: '' },
    policyNumber: { type: String, trim: true, default: '' },
    groupNumber: { type: String, trim: true, default: '' },
    validTill: { type: Date, default: null },
  },
  { _id: false }
);

const medicalSchema = new mongoose.Schema(
  {
    allergies: { type: [String], default: [] },
    conditions: { type: [String], default: [] },
    medications: { type: [String], default: [] },
    surgeries: { type: [String], default: [] },
    familyHistory: { type: [String], default: [] },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      index: true,
    },
    patientCode: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'male', 'female', 'other', 'prefer_not_to_say'],
      default: 'Other',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
      default: '',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true,
    },
    contact: {
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Discharged', 'active', 'inactive', 'discharged', 'deceased'],
      default: 'Active',
    },
    medicalNotes: {
      type: String,
      trim: true,
      default: '',
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed', 'other'],
      default: 'single',
    },
    nationalId: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    insurance: {
      type: insuranceSchema,
      default: () => ({}),
    },
    medical: {
      type: medicalSchema,
      default: () => ({}),
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    portalAccessRequested: {
      type: Boolean,
      default: false,
    },
    portalAccessEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    portalAccessRequestedAt: {
      type: Date,
      default: null,
    },
    portalAccessRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    portalAccessStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    portalAccessRejectionReason: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.virtual('age').get(function computeAge() {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - new Date(this.dateOfBirth).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

patientSchema.pre('validate', function ensurePatientCode(next) {
  if (!this.patientCode) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.patientCode = `PAT-${new Date().getFullYear()}-${rand}`;
  }

  if (!this.patientId) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.patientId = `PAT-${new Date().getFullYear()}-${rand}`;
  }

  if (!this.name && this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`.trim();
  }

  if (this.gender === 'male') this.gender = 'Male';
  if (this.gender === 'female') this.gender = 'Female';
  if (this.gender === 'other' || this.gender === 'prefer_not_to_say') this.gender = 'Other';

  if (this.status === 'active') this.status = 'Active';
  if (this.status === 'inactive') this.status = 'Inactive';
  if (this.status === 'discharged') this.status = 'Discharged';

  next();
});

patientSchema.index({ firstName: 1, lastName: 1 });
patientSchema.index({ 'contact.email': 1 });
patientSchema.index({ 'contact.phone': 1 });

export default mongoose.model('Patient', patientSchema);
