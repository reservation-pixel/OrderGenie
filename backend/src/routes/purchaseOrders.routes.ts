import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole, scopeToOutlet } from '../middleware/rbac.middleware';
import { listPurchaseOrdersHandler, getPurchaseOrderHandler } from '../controllers/purchaseOrders.controller';

const router = Router();

router.use(verifyJwt, requireRole(RoleName.ADMIN, RoleName.MANAGEMENT, RoleName.OUTLET_MANAGER), scopeToOutlet);

router.get('/:id', getPurchaseOrderHandler);
router.get('/', listPurchaseOrdersHandler);

export default router;
