import type { Outlet } from '@prisma/client';
import { SyncType, TriggerType, SyncStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { logger } from '../../utils/logger';

export interface SyncOutletResult {
  fetched: number;
  created: number;
  updated: number;
  failed?: number;
}

export interface SyncRunSummary {
  syncType: SyncType;
  outletResults: Array<{ outletId: string; outletName: string; status: SyncStatus; error?: string } & Partial<SyncOutletResult>>;
}

/**
 * Runs `perOutletFn` once per outlet, writing one SyncLog row per (syncType, outlet)
 * attempt. A failure on one outlet is caught and logged without aborting the run for
 * the remaining outlets — this is the single place that guarantees Settings/Outlets
 * pages can show "last sync" status without every sync service reimplementing logging.
 */
export async function runSync(
  syncType: SyncType,
  triggerType: TriggerType,
  outlets: Outlet[],
  perOutletFn: (outlet: Outlet) => Promise<SyncOutletResult>,
  triggeredByUserId?: string
): Promise<SyncRunSummary> {
  const outletResults: SyncRunSummary['outletResults'] = [];

  for (const outlet of outlets) {
    const log = await prisma.syncLog.create({
      data: {
        syncType,
        triggerType,
        outletId: outlet.id,
        status: SyncStatus.RUNNING,
        triggeredByUserId,
      },
    });

    try {
      const result = await perOutletFn(outlet);
      const status = (result.failed ?? 0) > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS;

      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status,
          completedAt: new Date(),
          recordsFetched: result.fetched,
          recordsCreated: result.created,
          recordsUpdated: result.updated,
          recordsFailed: result.failed ?? 0,
        },
      });

      outletResults.push({ outletId: outlet.id, outletName: outlet.name, status, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[sync] ${syncType} failed for outlet ${outlet.name}`, { err: message });

      await prisma.syncLog.update({
        where: { id: log.id },
        data: { status: SyncStatus.FAILED, completedAt: new Date(), errorMessage: message },
      });

      outletResults.push({ outletId: outlet.id, outletName: outlet.name, status: SyncStatus.FAILED, error: message });
    }
  }

  return { syncType, outletResults };
}
