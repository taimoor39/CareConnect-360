import mongoose from 'mongoose';
import { formatPKT } from '../utils/timezone.js';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    target: {
      type: String,
      required: true,
      trim: true,
    },
    targetCollection: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

auditLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.createdAtPKT = formatPKT(ret.createdAt);
    ret.updatedAtPKT = formatPKT(ret.updatedAt);
    return ret;
  },
});

export default mongoose.model('AuditLog', auditLogSchema);
