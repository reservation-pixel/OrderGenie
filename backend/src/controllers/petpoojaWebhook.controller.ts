import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, AppError } from '../utils/apiResponse';
import { handlePurchaseOrderWebhook, verifyWebhookCredentials } from '../services/petpooja/purchaseOrderWebhook.service';
import type { PetpoojaPurchaseOrderWebhookPayload } from '../services/petpooja/types';

export const purchaseOrderWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body as Partial<PetpoojaPurchaseOrderWebhookPayload>;

  if (!payload?.data?.id || !payload.data.poNumber) {
    throw new AppError('Malformed webhook payload', 400);
  }
  if (!(await verifyWebhookCredentials(payload as PetpoojaPurchaseOrderWebhookPayload))) {
    throw new AppError('Invalid webhook credentials', 401);
  }

  const result = await handlePurchaseOrderWebhook(payload as PetpoojaPurchaseOrderWebhookPayload);
  return ok(res, result);
});
