import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { listPredictedSales } from '../services/predictedSales/predictedSales.service';

export const listPredictedSalesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { rows, meta } = await listPredictedSales(req.query as Record<string, string>);
  return ok(res, rows, meta);
});
