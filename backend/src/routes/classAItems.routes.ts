import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole, scopeToOutlet } from '../middleware/rbac.middleware';
import {
  listClassAItemsHandler,
  addClassAItemHandler,
  removeClassAItemHandler,
  getClassAItemsSummaryHandler,
} from '../controllers/classAItems.controller';

const router = Router();

router.use(verifyJwt, requireRole(RoleName.ADMIN, RoleName.MANAGEMENT, RoleName.OUTLET_MANAGER), scopeToOutlet);

// /summary must be registered before /:id so "summary" isn't captured as an id param.
router.get('/summary', getClassAItemsSummaryHandler);
router.get('/', listClassAItemsHandler);
router.post('/', addClassAItemHandler);
router.delete('/:id', removeClassAItemHandler);

export default router;
