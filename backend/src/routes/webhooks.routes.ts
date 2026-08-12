import { Router } from 'express';
import { purchaseOrderWebhookHandler } from '../controllers/petpoojaWebhook.controller';

// Public — Petpooja calls this directly, it can't authenticate as an OrderGenie
// user. Requests are verified via the app_key/app_secret/access_token carried
// in the payload itself (see purchaseOrderWebhook.service.ts).
const router = Router();

router.post('/petpooja/purchase-order', purchaseOrderWebhookHandler);

export default router;
