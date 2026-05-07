import mongoose from 'mongoose';

const CONNECT_OPTIONS = {
  // Fail fast if the cluster is unreachable — prevents the process from
  // hanging for the driver's default ~30s timeout during startup.
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  family: 4,
};

let listenersAttached = false;

/**
 * Attach connection-pool event listeners exactly once. Mongoose re-emits these
 * events on every reconnection cycle, so wiring them repeatedly would cause a
 * MaxListenersExceeded warning.
 */
const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
};

/**
 * Resolve the Mongo URI from the environment. `MONGODB_URI` is the canonical
 * name; `MONGO_URI` is accepted as a fallback to stay compatible with
 * deployments that use that variable.
 */
const resolveUri = () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');
  return uri;
};

export const connectDB = async () => {
  mongoose.set('strictQuery', true);
  attachListeners();
  await mongoose.connect(resolveUri(), CONNECT_OPTIONS);
};

/**
 * Close the active Mongo connection. Used by the graceful-shutdown handler in
 * server.js so in-flight queries can drain cleanly.
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
};
