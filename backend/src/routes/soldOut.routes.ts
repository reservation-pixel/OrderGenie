import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware';
import { scopeToOutlet } from '../middleware/rbac.middleware';
import { listSoldOutHandler, upsertSoldOutEntryHandler } from '../controllers/soldOut.controller';

const router = Router();

router.use(verifyJwt, scopeToOutlet);

router.get('/', listSoldOutHandler);
router.post('/entries', upsertSoldOutEntryHandler);

export default router;
