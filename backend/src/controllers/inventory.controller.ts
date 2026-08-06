import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import {
  listInventory,
  getInventoryById,
  listInventoryStores,
  listInventoryCategories,
} from '../services/inventory/inventory.service';
import { outletRestrictionFor } from '../utils/authz';

export const listInventoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await listInventory(req.query as Record<string, string>);
  return ok(res, rows, meta);
});

export const getInventoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getInventoryById(req.params.id, outletRestrictionFor(req));
  return ok(res, data);
});

export const listInventoryStoresHandler = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await listInventoryStores());
});

export const listInventoryCategoriesHandler = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await listInventoryCategories());
});
