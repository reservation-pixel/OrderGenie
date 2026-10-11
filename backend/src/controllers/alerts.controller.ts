import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { getMissingClosings } from '../services/alerts/missingClosings.service';

export const missingClosingsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await getMissingClosings();
  return ok(res, rows);
});

/**
 * The signed-in user's own outlet. The outlet comes from the token, never from the query, so one
 * outlet's staff can't ask about another's; a user with no outlet assigned gets nothing rather
 * than everything.
 */
export const myMissingClosingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const outletId = req.user?.outletId;
  const rows = await getMissingClosings(new Date(), outletId ? [outletId] : []);
  return ok(res, rows);
});
