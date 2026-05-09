import { Server } from 'socket.io';

import User from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

let ioInstance = null;

/**
 * Attach Socket.IO to the HTTP server. Only admins may connect (JWT in handshake.auth.token).
 * Emits `admin:refresh` with optional `scopes: ('dashboard'|'portalBadge'|'billing')[]`.
 */
export function initAdminRealtime(httpServer, { corsOrigins = [] } = {}) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: corsOrigins.length ? corsOrigins : true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    try {
      const raw = socket.handshake.auth?.token ?? socket.handshake.query?.token;
      const token = typeof raw === 'string' ? raw.trim() : '';
      if (!token) return next(new Error('Unauthorized'));

      const payload = verifyToken(token);
      const user = await User.findById(payload.sub).select('_id role isActive tokenVersion').lean();
      if (!user?.isActive || user.role !== 'admin') return next(new Error('Forbidden'));
      if (Number(payload.tv ?? 0) !== Number(user.tokenVersion ?? 0)) return next(new Error('Unauthorized'));

      socket.join('admins');
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.emit('admin:connected', { ok: true });
  });

  ioInstance = io;
  return io;
}

/** Push refresh hints to all connected admin dashboards / sidebars. */
export function notifyAdmins(payload = {}) {
  if (!ioInstance) return;
  ioInstance.to('admins').emit('admin:refresh', {
    ts: Date.now(),
    ...payload,
  });
}
