import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware';
import { scopeToOutlet } from '../middleware/rbac.middleware';
import {
  listInventoryHandler,
  getInventoryHandler,
  listInventoryStoresHandler,
  listInventoryCategoriesHandler,
} from '../controllers/inventory.controller';

const router = Router();

router.use(verifyJwt, scopeToOutlet);

router.get('/stores', listInventoryStoresHandler);
router.get('/categories', listInventoryCategoriesHandler);
router.get('/:id', getInventoryHandler);
router.get('/', listInventoryHandler);

export default router;
