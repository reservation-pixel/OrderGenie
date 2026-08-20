import type { Request, Response } from 'express';
import { z } from 'zod';
import { SyncType, TriggerType } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/apiResponse';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { runSalesSync } from '../services/sync/salesSync.service';
import { runPurchaseSync } from '../services/sync/purchaseSync.service';
import { runTransferSync } from '../services/sync/transferSync.service';
import { runDataRetentionCleanup } from '../services/sync/historicalSync.service';

const manualSyncSchema = z.object({
  syncType: z.nativeEnum(SyncType),
  outletIds: z.array(z.string()).optional(),
});

/**
 * Runs the sync in the background rather than being awaited by the request handler.
 * A manual trigger across several outlets can take minutes (each outlet is synced
 * sequentially, and Petpooja API calls alone can take 60-90s) — long enough to blow
 * past the frontend/proxy request timeout even though the sync itself succeeds, which
 * showed up as a false "sync failed" toast. Progress/results are visible via the
 * existing SyncLog rows (Settings > Sync Schedule polls these every 15s), same as cron
 * runs already work.
 */
function runInBackground(promise: Promise<unknown>, syncType: SyncType) {
  promise.catch((err) => {
    logger.error(`[sync] manual ${syncType} trigger failed`, { err: err instanceof Error ? err.message : String(err) });
  });
}

export const triggerManualSyncHandler = asyncHandler(async (req: Request, res: Response) => {
  const { syncType, outletIds } = manualSyncSchema.parse(req.body);
  const userId = req.user!.id;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  switch (syncType) {
    case SyncType.SALES:
      runInBackground(
        runSalesSync(TriggerType.MANUAL, yesterday, userId, outletIds).then(() => runSalesSync(TriggerType.MANUAL, today, userId, outletIds)),
        syncType
      );
      break;
    case SyncType.PURCHASE: {
      const from = new Date(yesterday);
      from.setDate(from.getDate() - 6);
      runInBackground(runPurchaseSync(TriggerType.MANUAL, from, today, userId, outletIds), syncType);
      break;
    }
    case SyncType.TRANSFER: {
      const from = new Date(yesterday);
      from.setDate(from.getDate() - 6);
      runInBackground(runTransferSync(TriggerType.MANUAL, from, yesterday, userId, outletIds), syncType);
      break;
    }
    case SyncType.HISTORICAL:
      runInBackground(runDataRetentionCleanup(TriggerType.MANUAL, userId), syncType);
      break;
    default:
      throw new AppError('Unsupported sync type', 400);
  }

  return ok(res, { started: true, syncType });
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
