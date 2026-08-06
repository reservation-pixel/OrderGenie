import { SyncType, TriggerType } from '@prisma/client';
import { setJobHandler } from '../index';
import { runSalesSync } from '../../services/sync/salesSync.service';
import { runPurchaseSync } from '../../services/sync/purchaseSync.service';
import { runInventorySync } from '../../services/sync/inventorySync.service';
import { runHistoricalSync } from '../../services/sync/historicalSync.service';

export function wireCronJobHandlers() {
  setJobHandler(SyncType.SALES, async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await runSalesSync(TriggerType.CRON, yesterday);
  });

  setJobHandler(SyncType.PURCHASE, async () => {
    const to = new Date();
    to.setDate(to.getDate() - 1);
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    await runPurchaseSync(TriggerType.CRON, from, to);
  });

  setJobHandler(SyncType.INVENTORY, async () => {
    await runInventorySync(TriggerType.CRON);
  });

  setJobHandler(SyncType.HISTORICAL, async () => {
    await runHistoricalSync(TriggerType.CRON);
  });

  // TRANSFER has no SyncSchedule row seeded (not in the PRD's sync cadence list) and
  // its Petpooja endpoint is undocumented; it stays on the cron/index.ts placeholder
  // handler and is only reachable via manual sync for now.
}
