import { TriggerType } from '@prisma/client';
import { prisma } from '../../config/db';
import { HISTORICAL_SYNC_WINDOW_DAYS } from '../../config/constants';
import { runSalesSync } from './salesSync.service';
import { runPurchaseSync } from './purchaseSync.service';

// Only the trailing week of operational data is kept at all — Sale/PurchaseOrder
// (and their line items, via cascade) and InventoryTransaction older than this are
// auto-deleted nightly. Deliberate: this app only needs recent history for
// Reconciliation (7-day trailing average) and day-of Sold Out lookups; unbounded
// retention is what caused a hosting provider's disk to fill up entirely from
// InventoryTransaction's raw JSON payloads. Sales/Item Sales/Reports pages will
// only ever show this trailing window going forward.
const DATA_RETENTION_DAYS = 7;

/**
 * Nightly re-sync of the trailing window to catch late corrections (e.g. a bill
 * edited in Petpooja after the original 5-minute sales sync already ran), plus
 * pruning data older than DATA_RETENTION_DAYS to keep storage bounded.
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
  cutoff.setDate(cutoff.getDate() - DATA_RETENTION_DAYS);

  // Sale -> SaleItem and PurchaseOrder -> PurchaseOrderItem both cascade on delete
  // (schema.prisma), so pruning the parent rows is enough to clean up line items too.
  const [prunedSales, prunedPurchaseOrders, prunedInventoryTransactions] = await Promise.all([
    prisma.sale.deleteMany({ where: { orderDate: { lt: cutoff } } }),
    prisma.purchaseOrder.deleteMany({ where: { orderDate: { lt: cutoff } } }),
    prisma.inventoryTransaction.deleteMany({ where: { transactionDate: { lt: cutoff } } }),
  ]);

  return {
    salesResults,
    purchaseResult,
    prunedSales: prunedSales.count,
    prunedPurchaseOrders: prunedPurchaseOrders.count,
    prunedInventoryTransactions: prunedInventoryTransactions.count,
  };
}
