import { TriggerType } from '@prisma/client';
import { HISTORICAL_SYNC_WINDOW_DAYS } from '../../config/constants';
import { runSalesSync } from './salesSync.service';
import { runPurchaseSync } from './purchaseSync.service';

/**
 * Nightly re-sync of the trailing window to catch late corrections (e.g. a bill
 * edited in Petpooja after the original 5-minute sales sync already ran).
 */
export async function runHistoricalSync(triggerType: TriggerType, triggeredByUserId?: string) {
  const today = new Date();
  const salesResults = [];

  for (let dayOffset = 1; dayOffset <= HISTORICAL_SYNC_WINDOW_DAYS; dayOffset++) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - dayOffset);
    salesResults.push(await runSalesSync(triggerType, targetDate, triggeredByUserId));
  }

  const purchaseFrom = new Date(today);
  purchaseFrom.setDate(purchaseFrom.getDate() - HISTORICAL_SYNC_WINDOW_DAYS);
  const purchaseTo = new Date(today);
  purchaseTo.setDate(purchaseTo.getDate() - 1);
  const purchaseResult = await runPurchaseSync(triggerType, purchaseFrom, purchaseTo, triggeredByUserId);

  return { salesResults, purchaseResult };
}
