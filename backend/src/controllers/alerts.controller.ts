import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { getMissingClosings } from '../services/alerts/missingClosings.service';

export const missingClosingsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await getMissingClosings();
  return ok(res, rows);
});
