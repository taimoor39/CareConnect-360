import { Router } from 'express';

import {
  approvePortalAccessRequest,
  createPortalAccessRequest,
  getPortalAccessForPatient,
  getPortalAccessStats,
  listPortalAccessRequests,
  reopenPortalAccessRequest,
  rejectPortalAccessRequest,
  updatePortalAccessRequestedEmail,
} from '../controllers/portalAccessController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createRequestValidator,
  rejectRequestValidator,
  updateEmailValidator,
} from '../validators/portalAccessValidators.js';

const router = Router();

router.use(protect);

router.get('/stats', authorizeRoles('admin'), getPortalAccessStats);
router.get('/patient/:patientId', authorizeRoles('admin', 'receptionist'), getPortalAccessForPatient);
router.get('/', authorizeRoles('admin'), listPortalAccessRequests);
router.post('/', authorizeRoles('admin', 'receptionist'), createRequestValidator, validate, createPortalAccessRequest);
router.put('/:id/approve', authorizeRoles('admin'), approvePortalAccessRequest);
router.put('/:id/reject', authorizeRoles('admin'), rejectRequestValidator, validate, rejectPortalAccessRequest);
router.put('/:id/update-email', authorizeRoles('admin', 'receptionist'), updateEmailValidator, validate, updatePortalAccessRequestedEmail);
router.put('/:id/reopen', authorizeRoles('admin'), rejectRequestValidator, validate, reopenPortalAccessRequest);

export default router;
