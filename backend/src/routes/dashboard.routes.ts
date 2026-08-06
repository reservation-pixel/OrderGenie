import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware';
import { scopeToOutlet } from '../middleware/rbac.middleware';
import { getDashboardHandler } from '../controllers/dashboard.controller';

const router = Router();

router.get('/', verifyJwt, scopeToOutlet, getDashboardHandler);

export default router;
