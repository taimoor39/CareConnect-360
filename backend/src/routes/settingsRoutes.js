import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';

import {
  changePassword,
  createMedicalTerm,
  deleteMedicalTerm,
  getAiServiceHealth,
  getPublicSettings,
  getSettings,
  listMedicalTerms,
  runCronJobNow,
  sendTestEmail,
  updateAiServiceSettings,
  updateClinicSettings,
  updateCronJobsSettings,
  updateEmailSettings,
  updateEmailTemplate,
  updateMedicalTerm,
  updateSecuritySettings,
  uploadClinicLogo,
} from '../controllers/settingsController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  aiServiceValidator,
  changePasswordValidator,
  clinicValidator,
  cronJobsValidator,
  emailTemplateValidator,
  emailValidator,
  medicalTermIdValidator,
  medicalTermsListValidator,
  medicalTermValidator,
  runJobValidator,
  securityValidator,
} from '../validators/settingsValidators.js';

const router = Router();

const logoDir = path.resolve(process.cwd(), 'uploads', 'logos');
fs.mkdirSync(logoDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, logoDir),
    filename: (_req, file, cb) => cb(null, `clinic-logo-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG and PNG files allowed'));
  },
});

router.get('/public', getPublicSettings);

router.use(protect);
router.put('/change-password', changePasswordValidator, validate, changePassword);

router.use(authorizeRoles('admin'));

router.get('/', getSettings);
router.put('/security', securityValidator, validate, updateSecuritySettings);
router.put('/email', emailValidator, validate, updateEmailSettings);
router.put('/email-templates', emailTemplateValidator, validate, updateEmailTemplate);
router.post('/test-email', sendTestEmail);
router.put('/cron-jobs', cronJobsValidator, validate, updateCronJobsSettings);
router.post('/run-job/:jobName', runJobValidator, validate, runCronJobNow);
router.put('/clinic', clinicValidator, validate, updateClinicSettings);
router.post('/clinic/logo', (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 2MB)' : err.message,
      });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, uploadClinicLogo);
router.put('/ai-service', aiServiceValidator, validate, updateAiServiceSettings);
router.get('/ai-health', getAiServiceHealth);

router.get('/medical-terms', medicalTermsListValidator, validate, listMedicalTerms);
router.post('/medical-terms', medicalTermValidator, validate, createMedicalTerm);
router.put('/medical-terms/:id', medicalTermIdValidator, medicalTermValidator, validate, updateMedicalTerm);
router.delete('/medical-terms/:id', medicalTermIdValidator, validate, deleteMedicalTerm);

export default router;
