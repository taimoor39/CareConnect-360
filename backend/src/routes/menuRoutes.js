import { Router } from 'express';

import { getSidebarMenus } from '../controllers/menuController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/sidebar', requireAuth, getSidebarMenus);

export default router;
