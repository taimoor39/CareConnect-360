import { Router } from 'express';
import multer from 'multer';

import {
  checkInAppointment,
  checkInAppointmentByImage,
  createAppointment,
  getAppointmentById,
  getAppointmentStats,
  getAppointmentsByDoctor,
  getAppointmentsByPatient,
  listAppointments,
  updateAppointmentStatus,
} from '../controllers/appointmentController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkInValidator, createAppointmentValidator, updateStatusValidator } from '../validators/appointmentValidators.js';

const router = Router();

// In-memory upload for QR image check-in: we only need the buffer to
// decode the QR — nothing is persisted to disk. 5MB is plenty for any
// phone screenshot or printed QR scan.
const qrImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Only PNG, JPG, WebP, GIF, or BMP images are allowed'));
  },
});

const handleQrImageUpload = (req, res, next) => {
  qrImageUpload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 5MB)' : err.message;
      return res.status(400).json({ success: false, message });
    }
    return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
  });
};

router.use(protect);

router.get('/', authorizeRoles('admin', 'receptionist', 'doctor', 'patient'), listAppointments);
router.get('/stats', authorizeRoles('admin', 'receptionist', 'doctor', 'patient'), getAppointmentStats);
router.get('/patient/:patientId', authorizeRoles('admin', 'receptionist', 'doctor', 'patient'), getAppointmentsByPatient);
router.get('/doctor/:doctorId', authorizeRoles('admin', 'receptionist', 'doctor'), getAppointmentsByDoctor);
router.put('/checkin', authorizeRoles('admin', 'receptionist'), checkInValidator, validate, checkInAppointment);
router.post('/checkin/image', authorizeRoles('admin', 'receptionist'), handleQrImageUpload, checkInAppointmentByImage);
router.get('/:id', authorizeRoles('admin', 'receptionist', 'doctor', 'patient'), getAppointmentById);
router.post('/', authorizeRoles('admin', 'receptionist'), createAppointmentValidator, validate, createAppointment);
router.put('/:id/status', authorizeRoles('admin', 'receptionist', 'doctor'), updateStatusValidator, validate, updateAppointmentStatus);

export default router;
