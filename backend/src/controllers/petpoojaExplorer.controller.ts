import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { runExplorerFetch } from '../services/petpooja/explorer.service';

const fetchSchema = z.object({
  apiType: z.enum(['orders', 'purchase', 'transfer']),
  outletIds: z.array(z.string()).min(1),
  fromDate: z.string(),
  toDate: z.string(),
});

export const explorerFetchHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = fetchSchema.parse(req.body);
  const result = await runExplorerFetch({
    apiType: input.apiType,
    outletIds: input.outletIds,
    fromDate: new Date(`${input.fromDate}T00:00:00`),
    toDate: new Date(`${input.toDate}T23:59:59`),
  });
  return ok(res, result);
});
