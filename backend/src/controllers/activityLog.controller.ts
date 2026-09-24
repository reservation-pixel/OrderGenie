import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { getActivityLogFilters, listActivityLogs } from '../services/activityLog/activityLog.service';

export const listActivityLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await listActivityLogs(req.query as Record<string, string>);
  return ok(res, rows, meta);
});

export const activityLogFiltersHandler = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await getActivityLogFilters());
});
