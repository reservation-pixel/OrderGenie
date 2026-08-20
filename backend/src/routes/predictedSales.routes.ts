import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole, scopeToOutlet } from '../middleware/rbac.middleware';
import { listPredictedSalesHandler } from '../controllers/predictedSales.controller';

const router = Router();

router.use(verifyJwt, requireRole(RoleName.ADMIN, RoleName.MANAGEMENT, RoleName.OUTLET_MANAGER, RoleName.VIEWER), scopeToOutlet);

router.get('/', listPredictedSalesHandler);

export default router;
