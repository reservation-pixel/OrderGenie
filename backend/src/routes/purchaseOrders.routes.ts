import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware';
import { scopeToOutlet } from '../middleware/rbac.middleware';
import { listPurchaseOrdersHandler, getPurchaseOrderHandler } from '../controllers/purchaseOrders.controller';

const router = Router();

router.use(verifyJwt, scopeToOutlet);

router.get('/:id', getPurchaseOrderHandler);
router.get('/', listPurchaseOrdersHandler);

export default router;
