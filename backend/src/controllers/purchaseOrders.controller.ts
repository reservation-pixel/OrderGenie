import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { listPurchaseOrders, getPurchaseOrderById } from '../services/purchase/purchaseOrders.service';
import { outletRestrictionFor } from '../utils/authz';

export const listPurchaseOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await listPurchaseOrders(req.query as Record<string, string>);
  return ok(res, rows, meta);
});

export const getPurchaseOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getPurchaseOrderById(req.params.id, outletRestrictionFor(req));
  return ok(res, data);
});
