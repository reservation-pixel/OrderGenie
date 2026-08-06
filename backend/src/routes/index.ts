import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import salesRoutes from './sales.routes';
import outletsRoutes from './outlets.routes';
import inventoryRoutes from './inventory.routes';
import purchaseOrdersRoutes from './purchaseOrders.routes';
import reportsRoutes from './reports.routes';
import settingsRoutes from './settings.routes';
import syncRoutes from './sync.routes';
import petpoojaExplorerRoutes from './petpoojaExplorer.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/sales', salesRoutes);
router.use('/outlets', outletsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/sync', syncRoutes);
router.use('/petpooja-explorer', petpoojaExplorerRoutes);

export default router;
