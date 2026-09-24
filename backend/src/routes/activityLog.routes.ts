import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { activityLogFiltersHandler, listActivityLogsHandler } from '../controllers/activityLog.controller';

const router = Router();

// The log spans every outlet and carries request payloads from all of Settings, so it is
// SUPER_ADMIN-only — deliberately not widened by outlet or brand scoping.
router.use(verifyJwt, requireRole(RoleName.SUPER_ADMIN));

router.get('/', listActivityLogsHandler);
router.get('/filters', activityLogFiltersHandler);

export default router;
