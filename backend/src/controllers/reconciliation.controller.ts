import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { setActivityDetail } from '../middleware/activityLog.middleware';
import { ok, created } from '../utils/apiResponse';
import {
  getReconciliationDashboard,
  saveItemOrder,
  upsertReconciliationEntry,
  clearAllOpeningsForDay,
  clearAllClosingsForDay,
} from '../services/reconciliation/reconciliation.service';

export const listReconciliationHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await getReconciliationDashboard(req.query as Record<string, string>);
  return ok(res, rows, meta);
});

const upsertSchema = z.object({
  outletId: z.string().min(1),
  itemName: z.string().min(1),
  unit: z.string().optional(),
  category: z.string().optional(),
  date: z.string().min(1),
  opening: z.number().int().nonnegative().optional(),
  actualClosing: z.number().int().nonnegative().optional(),
});

export const upsertReconciliationEntryHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = upsertSchema.parse(req.body);
  const { row, day, changes } = await upsertReconciliationEntry(input);
  // Only this handler knows what the numbers were before the save.
  setActivityDetail(res, { itemName: input.itemName, outletId: input.outletId, stockDate: day, changes });
  return created(res, row);
});

function itemCount(n: number): string {
  return `${n} ${n === 1 ? 'item' : 'items'}`;
}

const clearDaySchema = z.object({
  outletId: z.string().min(1),
  brand: z.string().min(1),
  date: z.string().min(1),
});

export const clearAllOpeningsHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = clearDaySchema.parse(req.query);
  const result = await clearAllOpeningsForDay(input);
  // How many rows a bulk clear actually took with it is the part worth auditing.
  setActivityDetail(res, { label: `Cleared all openings · ${itemCount(result.cleared)}` });
  return ok(res, result);
});

export const clearAllClosingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = clearDaySchema.parse(req.query);
  const result = await clearAllClosingsForDay(input);
  setActivityDetail(res, { label: `Cleared all closings · ${itemCount(result.cleared)}` });
  return ok(res, result);
});

const orderSchema = z.object({
  brand: z.string().min(1),
  itemNames: z.array(z.string().min(1)).max(500),
});

export const saveItemOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const { brand, itemNames } = orderSchema.parse(req.body);
  return ok(res, await saveItemOrder(brand, itemNames));
});
