import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import {
  getReconciliationDashboard,
  saveItemOrder,
  upsertReconciliationEntry,
  deleteReconciliationEntry,
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
  const row = await upsertReconciliationEntry(input);
  return created(res, row);
});

const deleteQuerySchema = z.object({
  outletId: z.string().min(1),
  itemName: z.string().min(1),
  date: z.string().min(1),
});

export const deleteReconciliationEntryHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = deleteQuerySchema.parse(req.query);
  await deleteReconciliationEntry(input);
  return ok(res, { removed: true });
});

const clearDaySchema = z.object({
  outletId: z.string().min(1),
  brand: z.string().min(1),
  date: z.string().min(1),
});

export const clearAllOpeningsHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = clearDaySchema.parse(req.query);
  return ok(res, await clearAllOpeningsForDay(input));
});

export const clearAllClosingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = clearDaySchema.parse(req.query);
  return ok(res, await clearAllClosingsForDay(input));
});

const orderSchema = z.object({
  brand: z.string().min(1),
  itemNames: z.array(z.string().min(1)).max(500),
});

export const saveItemOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const { brand, itemNames } = orderSchema.parse(req.body);
  return ok(res, await saveItemOrder(brand, itemNames));
});
