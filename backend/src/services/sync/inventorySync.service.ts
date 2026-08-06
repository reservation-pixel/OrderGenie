import type { Outlet } from '@prisma/client';
import { ApiType, DataSource, TriggerType } from '@prisma/client';
import { prisma } from '../../config/db';
import { resolveCredentials } from '../petpooja/credentials';
import { fetchStockLevels } from '../petpooja/inventoryStockApi.service';
import { dateOnlyUtc } from '../../utils/dateRange';
import { runSync, type SyncOutletResult, type SyncRunSummary } from './syncRunner.service';

async function syncOutletInventory(outlet: Outlet): Promise<SyncOutletResult> {
  const credentials = await resolveCredentials(ApiType.INVENTORY);
  const asOf = new Date();
  const stockDate = dateOnlyUtc(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());

  const items = await fetchStockLevels(credentials, outlet.inventorySyncCode ?? '', asOf);

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const existing = await prisma.inventory.findUnique({
      where: { outletId_itemName_stockDate: { outletId: outlet.id, itemName: item.item_name, stockDate } },
      select: { id: true },
    });

    const data = {
      category: item.category ?? null,
      unit: item.unit ?? null,
      openingStock: item.opening_stock,
      purchasedQty: item.purchased_qty,
      consumedQty: item.consumed_qty,
      closingStock: item.closing_stock,
      currentStock: item.closing_stock,
      unitValue: item.unit_value,
      stockValue: item.closing_stock * item.unit_value,
      isLowStock: item.closing_stock < 10,
      source: DataSource.PETPOOJA,
    };

    if (existing) {
      await prisma.inventory.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.inventory.create({ data: { outletId: outlet.id, itemName: item.item_name, stockDate, ...data } });
      created++;
    }
  }

  return { fetched: items.length, created, updated };
}

export async function runInventorySync(triggerType: TriggerType, triggeredByUserId?: string, outletIds?: string[]): Promise<SyncRunSummary> {
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true, ...(outletIds ? { id: { in: outletIds } } : {}) },
  });

  return runSync('INVENTORY', triggerType, outlets, syncOutletInventory, triggeredByUserId);
}
