import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  listPurchaseOrderWebhookLogsHandler,
  getPurchaseOrderWebhookLogHandler,
} from '../controllers/purchaseOrderWebhookLogs.controller';

const router = Router();

router.use(verifyJwt, requireRole(RoleName.ADMIN));

router.get('/:id', getPurchaseOrderWebhookLogHandler);
router.get('/', listPurchaseOrderWebhookLogsHandler);

export default router;
