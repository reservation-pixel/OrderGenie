import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { listSales, getSaleById, listItemSales, getItemDetail, listItemCategories } from '../services/sales/sales.service';
import { outletRestrictionFor } from '../utils/authz';

export const listSalesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await listSales(req.query as Record<string, string>);
  return ok(res, rows, meta);
});

export const getSaleHandler = asyncHandler(async (req: Request, res: Response) => {
  const sale = await getSaleById(req.params.id, outletRestrictionFor(req));
  return ok(res, sale);
});

export const listItemSalesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await listItemSales(req.query as Record<string, string>);
  return ok(res, rows, meta);
});

export const getItemDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const itemName = decodeURIComponent(req.params.itemName);
  const data = await getItemDetail(itemName, req.query as Record<string, string>);
  return ok(res, data);
});

export const listItemCategoriesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await listItemCategories();
  return ok(res, categories);
});
