import { TriggerType } from '@prisma/client';
import { prisma } from '../../config/db';
import { HISTORICAL_SYNC_WINDOW_DAYS } from '../../config/constants';
import { runSalesSync } from './salesSync.service';
import { runPurchaseSync } from './purchaseSync.service';

// InventoryTransaction stores a raw JSON payload per row and gets written to
// frequently (every Purchase sync cycle picks up internal transfers) — without a
// retention window it grows unbounded. Only the trailing week is kept; older rows
// aren't needed for anything currently in the app (Reconciliation/Sold Out read
// from Sale/Inventory/PurchaseOrder, not InventoryTransaction history).
const INVENTORY_TRANSACTION_RETENTION_DAYS = 7;

/**
 * Nightly re-sync of the trailing window to catch late corrections (e.g. a bill
 * edited in Petpooja after the original 5-minute sales sync already ran), plus
 * pruning old InventoryTransaction rows to keep storage bounded.
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

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - INVENTORY_TRANSACTION_RETENTION_DAYS);
  const pruned = await prisma.inventoryTransaction.deleteMany({ where: { transactionDate: { lt: cutoff } } });

  return { salesResults, purchaseResult, prunedInventoryTransactions: pruned.count };
}
