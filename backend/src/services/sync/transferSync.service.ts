import type { Outlet } from '@prisma/client';
import { DataSource, InventoryTransactionType, TriggerType } from '@prisma/client';
import { prisma } from '../../config/db';
import { fetchTransfers } from '../petpooja/transferApi.service';
import { mapPetpoojaTransfer } from '../petpooja/mappers/transferMapper';
import { runSync, type SyncOutletResult, type SyncRunSummary } from './syncRunner.service';

async function syncOutletTransfers(outlet: Outlet, fromDate: Date, toDate: Date): Promise<SyncOutletResult> {
  const transfers = await fetchTransfers(null, outlet.inventorySyncCode ?? '', fromDate, toDate);

  let created = 0;

  for (const transfer of transfers) {
    const mapped = mapPetpoojaTransfer(transfer);

    for (const leg of mapped.outgoing) {
      await prisma.inventoryTransaction.create({
        data: {
          outletId: outlet.id,
          itemName: leg.itemName,
          transactionType: InventoryTransactionType.TRANSFER_OUT,
          quantity: leg.quantity,
          unit: leg.unit,
          referenceType: 'TRANSFER',
          referenceId: leg.referenceId,
          destinationOutletId: mapped.destinationRid,
          transactionDate: leg.transactionDate,
          source: DataSource.PETPOOJA,
        },
      });
      created++;
    }
  }

  return { fetched: transfers.length, created, updated: 0 };
}

export async function runTransferSync(
  triggerType: TriggerType,
  fromDate: Date,
  toDate: Date,
  triggeredByUserId?: string,
  outletIds?: string[]
): Promise<SyncRunSummary> {
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true, outletType: { in: ['OUTLET', 'PREP_KITCHEN'] }, ...(outletIds ? { id: { in: outletIds } } : {}) },
  });

  return runSync('TRANSFER', triggerType, outlets, (outlet) => syncOutletTransfers(outlet, fromDate, toDate), triggeredByUserId);
}
