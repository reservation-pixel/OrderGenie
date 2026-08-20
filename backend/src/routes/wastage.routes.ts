import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole, scopeToOutlet } from '../middleware/rbac.middleware';
import { listWastageHandler, createWastageHandler, deleteWastageHandler } from '../controllers/wastage.controller';

const router = Router();

const canWrite = requireRole(RoleName.ADMIN, RoleName.MANAGEMENT, RoleName.OUTLET_MANAGER);

router.use(verifyJwt, requireRole(RoleName.ADMIN, RoleName.MANAGEMENT, RoleName.OUTLET_MANAGER, RoleName.VIEWER), scopeToOutlet);

router.get('/', listWastageHandler);
router.post('/', canWrite, createWastageHandler);
router.delete('/:id', canWrite, deleteWastageHandler);

export default router;
