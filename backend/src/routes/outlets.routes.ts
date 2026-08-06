import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole, scopeToOutlet } from '../middleware/rbac.middleware';
import { RoleName } from '@prisma/client';
import { listOutletsHandler, getOutletsOverviewHandler, getOutletComparisonHandler } from '../controllers/outlets.controller';

const router = Router();

router.use(verifyJwt);

router.get('/overview', requireRole(RoleName.ADMIN, RoleName.MANAGEMENT), getOutletsOverviewHandler);
router.get('/comparison', requireRole(RoleName.ADMIN, RoleName.MANAGEMENT), getOutletComparisonHandler);
router.get('/', scopeToOutlet, listOutletsHandler);

export default router;
