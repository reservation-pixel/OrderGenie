import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware';
import { scopeToOutlet } from '../middleware/rbac.middleware';
import { listReconciliationHandler, upsertReconciliationEntryHandler } from '../controllers/reconciliation.controller';

const router = Router();

router.use(verifyJwt, scopeToOutlet);

router.get('/', listReconciliationHandler);
router.post('/entries', upsertReconciliationEntryHandler);

export default router;
