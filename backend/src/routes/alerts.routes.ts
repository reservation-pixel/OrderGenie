import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { missingClosingsHandler } from '../controllers/alerts.controller';

const router = Router();

// Spans every outlet of every brand, so it stays with SUPER_ADMIN — deliberately not scoped
// down for outlet or brand users, who already see their own gaps on their own page.
router.use(verifyJwt, requireRole(RoleName.SUPER_ADMIN));

router.get('/missing-closings', missingClosingsHandler);

export default router;
