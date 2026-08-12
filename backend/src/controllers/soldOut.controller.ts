import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import { getSoldOutDashboard, upsertSoldOutEntry } from '../services/soldOut/soldOut.service';

export const listSoldOutHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await getSoldOutDashboard(req.query as Record<string, string>);
  return ok(res, rows, meta);
});

const upsertSchema = z.object({
  outletId: z.string().min(1),
  itemName: z.string().min(1),
  date: z.string().min(1),
  missedQty: z.number().int().nonnegative(),
});

export const upsertSoldOutEntryHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = upsertSchema.parse(req.body);
  const entry = await upsertSoldOutEntry({ ...input, reportedById: req.user?.id });
  return created(res, entry);
});
