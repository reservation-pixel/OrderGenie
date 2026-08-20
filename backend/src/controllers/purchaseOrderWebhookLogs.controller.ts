import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import {
  listPurchaseOrderWebhookLogs,
  getPurchaseOrderWebhookLogById,
} from '../services/purchase/purchaseOrderWebhookLogs.service';

export const listPurchaseOrderWebhookLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await listPurchaseOrderWebhookLogs(req.query as Record<string, string>);
  return ok(res, rows, meta);
});

export const getPurchaseOrderWebhookLogHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getPurchaseOrderWebhookLogById(req.params.id);
  return ok(res, data);
});
