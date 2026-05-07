import mongoose from 'mongoose';

const WORKING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const emailTemplateSchema = new mongoose.Schema(
  {
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
  },
  { _id: false }
);

const workingHoursSchema = new mongoose.Schema(
  {
    day: { type: String, enum: WORKING_DAYS, required: true },
    isOpen: { type: Boolean, default: true },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  { _id: false }
);

const systemSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'default',
      unique: true,
      index: true,
      immutable: true,
      trim: true,
    },
    security: {
      jwtExpiryHours: { type: Number, default: 24 },
      refreshTokenEnabled: { type: Boolean, default: false },
      minPasswordLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireNumber: { type: Boolean, default: true },
      requireSpecialChar: { type: Boolean, default: false },
      passwordExpiryDays: { type: Number, default: 0 },
      maxLoginAttempts: { type: Number, default: 5 },
      fileUploadLimitMB: { type: Number, default: 10 },
      corsAllowedOrigin: { type: String, default: 'http://localhost:5173' },
    },
    email: {
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: '' },
      smtpPass: { type: String, default: '' },
      smtpEncryption: { type: String, enum: ['none', 'ssl', 'tls'], default: 'tls' },
      fromName: { type: String, default: 'CareConnect 360' },
      fromEmail: { type: String, default: '' },
      replyTo: { type: String, default: '' },
      enabled: { type: Boolean, default: false },
    },
    emailTemplates: {
      appointmentReminder: {
        type: emailTemplateSchema,
        default: () => ({
          subject: 'Reminder: Your appointment tomorrow at {time}',
          body: '',
        }),
      },
      missedAppointment: {
        type: emailTemplateSchema,
        default: () => ({
          subject: "We missed you today — Let's reschedule",
          body: '',
        }),
      },
      prescriptionRenewal: {
        type: emailTemplateSchema,
        default: () => ({
          subject: 'Prescription renewal reminder',
          body: '',
        }),
      },
      reEngagement: {
        type: emailTemplateSchema,
        default: () => ({
          subject: "We haven't seen you in a while, {patientName}",
          body: '',
        }),
      },
      aiSummaryReady: {
        type: emailTemplateSchema,
        default: () => ({
          subject: 'Your medical report summary is ready',
          body: '',
        }),
      },
    },
    cronJobs: {
      appointmentReminder: {
        enabled: { type: Boolean, default: true },
        schedule: { type: String, default: '0 9 * * *' },
      },
      patientReEngagement: {
        enabled: { type: Boolean, default: true },
        schedule: { type: String, default: '0 10 * * *' },
      },
      prescriptionRenewal: {
        enabled: { type: Boolean, default: true },
        schedule: { type: String, default: '0 8 * * *' },
      },
    },
    clinic: {
      name: { type: String, default: 'CareConnect 360' },
      tagline: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      registrationNumber: { type: String, default: '' },
      address: {
        line1: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        postal: { type: String, default: '' },
        country: { type: String, default: 'Pakistan' },
      },
      defaultTaxRate: { type: Number, default: 0 },
      currencySymbol: { type: String, default: 'Rs.' },
      invoicePrefix: { type: String, default: 'INV' },
      invoiceFooterNote: { type: String, default: '' },
      workingHours: {
        type: [workingHoursSchema],
        default: () => WORKING_DAYS.map((day) => ({ day })),
      },
      logoUrl: { type: String, default: '' },
    },
    aiService: {
      url: { type: String, default: 'http://localhost:8001' },
      timeoutSeconds: { type: Number, default: 30 },
      maxReportLength: { type: Number, default: 10000 },
      enabled: { type: Boolean, default: true },
      autoSummarize: { type: Boolean, default: false },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('SystemSettings', systemSettingsSchema);
