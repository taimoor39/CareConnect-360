import { Router } from 'express';

import { runSeeders } from '../controllers/seedController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.post('/run', runSeeders);

export default router;
