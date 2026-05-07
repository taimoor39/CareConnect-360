import mongoose from 'mongoose';

const menuChildSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    allowedRoles: {
      type: [String],
      default: ['admin'],
    },
  },
  { _id: false }
);

const menuSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    allowedRoles: {
      type: [String],
      default: ['admin'],
    },
    children: {
      type: [menuChildSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Menu', menuSchema);
