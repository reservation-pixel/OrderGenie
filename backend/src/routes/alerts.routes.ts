import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { missingClosingsHandler, myMissingClosingsHandler } from '../controllers/alerts.controller';

const router = Router();

router.use(verifyJwt);

// Spans every outlet of every brand, so it stays with SUPER_ADMIN.
router.get('/missing-closings', requireRole(RoleName.SUPER_ADMIN), missingClosingsHandler);

// The outlet-scoped twin, for the staff who can actually enter the figures.
router.get(
  '/my-missing-closings',
  requireRole(RoleName.HEAD_CHEF, RoleName.OUTLET_MANAGER),
  myMissingClosingsHandler
);

export default router;
