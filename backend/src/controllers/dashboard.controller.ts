import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { getDashboard } from '../services/dashboard/dashboard.service';

export const getDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const outletId = typeof req.query.outletId === 'string' ? req.query.outletId : undefined;
  const data = await getDashboard(outletId, req.query as Record<string, string>);
  return ok(res, data);
});
