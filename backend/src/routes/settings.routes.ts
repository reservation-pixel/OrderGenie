import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { verifyJwt } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  listApiConfigsHandler,
  updateApiConfigHandler,
  listSyncSchedulesHandler,
  updateSyncScheduleHandler,
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  listRolesHandler,
  updateRoleHandler,
  getNotificationSettingsHandler,
  updateNotificationSettingsHandler,
} from '../controllers/settings.controller';

const router = Router();

router.use(verifyJwt);

// Self-service, any authenticated user
router.get('/notifications', getNotificationSettingsHandler);
router.put('/notifications', updateNotificationSettingsHandler);

// Admin-only
const adminOnly = requireRole(RoleName.ADMIN);

router.get('/api-config', adminOnly, listApiConfigsHandler);
router.put('/api-config/:apiType', adminOnly, updateApiConfigHandler);

router.get('/sync-schedule', adminOnly, listSyncSchedulesHandler);
router.put('/sync-schedule/:syncType', adminOnly, updateSyncScheduleHandler);

router.get('/users', adminOnly, listUsersHandler);
router.post('/users', adminOnly, createUserHandler);
router.put('/users/:id', adminOnly, updateUserHandler);

router.get('/roles', adminOnly, listRolesHandler);
router.put('/roles/:id', adminOnly, updateRoleHandler);

export default router;
