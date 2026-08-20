import { SyncType, TriggerType } from '@prisma/client';
import { setJobHandler } from '../index';
import { runSalesSync } from '../../services/sync/salesSync.service';
import { runPurchaseSync } from '../../services/sync/purchaseSync.service';
import { runDataRetentionCleanup } from '../../services/sync/historicalSync.service';

export function wireCronJobHandlers() {
  setJobHandler(SyncType.SALES, async () => {
    // Both today and yesterday, every run — today for near-live data, yesterday to
    // still catch late corrections (e.g. a bill edited in Petpooja after it already
    // synced) now that there's no separate nightly resync doing that job anymore.
    // upsertSale is idempotent, so re-fetching both on every 5-min run is safe.
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    await runSalesSync(TriggerType.CRON, yesterday);
    await runSalesSync(TriggerType.CRON, today);
  });

  setJobHandler(SyncType.PURCHASE, async () => {
    const to = new Date(); // was yesterday — today's purchases never synced otherwise
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    await runPurchaseSync(TriggerType.CRON, from, to);
  });

  setJobHandler(SyncType.HISTORICAL, async () => {
    await runDataRetentionCleanup(TriggerType.CRON);
  });

  // INVENTORY has no SyncSchedule row (stock-level sync + transfer tracking dropped
  // entirely — Sales/Purchase only) and TRANSFER has no row either (undocumented
  // Petpooja endpoint) — both stay on the cron/index.ts placeholder handler and are
  // only reachable via manual sync.
}
