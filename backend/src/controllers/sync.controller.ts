import type { Request, Response } from 'express';
import { z } from 'zod';
import { SyncType, TriggerType } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/apiResponse';
import { prisma } from '../config/db';
import { runSalesSync } from '../services/sync/salesSync.service';
import { runPurchaseSync } from '../services/sync/purchaseSync.service';
import { runInventorySync } from '../services/sync/inventorySync.service';
import { runTransferSync } from '../services/sync/transferSync.service';
import { runHistoricalSync } from '../services/sync/historicalSync.service';

const manualSyncSchema = z.object({
  syncType: z.nativeEnum(SyncType),
  outletIds: z.array(z.string()).optional(),
});

export const triggerManualSyncHandler = asyncHandler(async (req: Request, res: Response) => {
  const { syncType, outletIds } = manualSyncSchema.parse(req.body);
  const userId = req.user!.id;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  switch (syncType) {
    case SyncType.SALES:
      return ok(res, await runSalesSync(TriggerType.MANUAL, yesterday, userId, outletIds));
    case SyncType.PURCHASE: {
      const from = new Date(yesterday);
      from.setDate(from.getDate() - 6);
      return ok(res, await runPurchaseSync(TriggerType.MANUAL, from, yesterday, userId, outletIds));
    }
    case SyncType.INVENTORY:
      return ok(res, await runInventorySync(TriggerType.MANUAL, userId, outletIds));
    case SyncType.TRANSFER: {
      const from = new Date(yesterday);
      from.setDate(from.getDate() - 6);
      return ok(res, await runTransferSync(TriggerType.MANUAL, from, yesterday, userId, outletIds));
    }
    case SyncType.HISTORICAL:
      return ok(res, await runHistoricalSync(TriggerType.MANUAL, userId));
    default:
      throw new AppError('Unsupported sync type', 400);
  }
});

export const listSyncLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const logs = await prisma.syncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { outlet: { select: { name: true } } },
  });

  return ok(
    res,
    logs.map((l) => ({
      id: l.id,
      syncType: l.syncType,
      triggerType: l.triggerType,
      outletId: l.outletId,
      outletName: l.outlet?.name ?? null,
      status: l.status,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
      recordsFetched: l.recordsFetched,
      recordsCreated: l.recordsCreated,
      recordsUpdated: l.recordsUpdated,
      recordsFailed: l.recordsFailed,
      errorMessage: l.errorMessage,
    }))
  );
});
