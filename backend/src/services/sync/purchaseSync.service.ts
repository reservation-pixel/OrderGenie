import type { Outlet } from '@prisma/client';
import { ApiType, DataSource, InventoryTransactionType, TriggerType } from '@prisma/client';
import { prisma } from '../../config/db';
import { resolveCredentials } from '../petpooja/credentials';
import { fetchPurchases } from '../petpooja/purchaseApi.service';
import {
  isTransferRecord,
  mapPetpoojaPurchase,
  mapPetpoojaTransferFromPurchase,
  type MappedPurchase,
  type MappedTransfer,
} from '../petpooja/mappers/purchaseMapper';
import { runSync, type SyncOutletResult, type SyncRunSummary } from './syncRunner.service';

async function resolveVendorId(name: string | null, petpoojaId: string | null, phone: string | null): Promise<string | undefined> {
  if (!name && !petpoojaId) return undefined;

  if (petpoojaId) {
    const vendor = await prisma.vendor.upsert({
      where: { petpoojaSupplierId: petpoojaId },
      update: { name: name ?? undefined, phone: phone ?? undefined },
      create: { name: name ?? 'Unknown Vendor', petpoojaSupplierId: petpoojaId, phone: phone ?? undefined },
    });
    return vendor.id;
  }

  const existing = await prisma.vendor.findFirst({ where: { name: name! } });
  if (existing) return existing.id;
  const created = await prisma.vendor.create({ data: { name: name!, phone: phone ?? undefined } });
  return created.id;
}

async function upsertPurchaseOrder(outletId: string, purchase: MappedPurchase): Promise<'created' | 'updated'> {
  const vendorId = await resolveVendorId(purchase.vendorName, purchase.vendorPetpoojaId, purchase.vendorPhone);

  const existing = await prisma.purchaseOrder.findUnique({
    where: { outletId_poNumber: { outletId, poNumber: purchase.poNumber } },
    select: { id: true },
  });

  const scalarData = {
    petpoojaPurchaseId: purchase.petpoojaPurchaseId,
    vendorId,
    invoiceNumber: purchase.invoiceNumber,
    totalAmount: purchase.totalAmount,
    taxAmount: purchase.taxAmount,
    orderDate: purchase.orderDate,
    rawPayload: purchase.rawPayload as object,
  };

  const items = purchase.items.map((i) => ({
    itemName: i.itemName,
    quantity: i.quantity,
    unit: i.unit,
    rate: i.rate,
    amount: i.amount,
    cgst: i.cgst,
    sgst: i.sgst,
    igst: i.igst,
    cess: i.cess,
    receivedQty: i.receivedQty,
    pendingQty: i.pendingQty,
  }));

  const status = 'RECEIVED'; // get_purchase only returns completed/active receipts, not pending POs

  if (existing) {
    await prisma.purchaseOrder.update({
      where: { id: existing.id },
      data: { ...scalarData, status, items: { deleteMany: {}, create: items } },
    });
    return 'updated';
  }

  await prisma.purchaseOrder.create({
    data: { outletId, poNumber: purchase.poNumber, status, ...scalarData, items: { create: items } },
  });
  return 'created';
}

/**
 * Transfer legs only carry sender/receiver NAMES (no RID), so we match them against
 * the outlet currently being synced. If neither side matches confidently, the leg is
 * still recorded (as ADJUSTMENT) with the raw payload preserved rather than dropped —
 * this can happen for outlets not yet in our known outlet list (Petpooja's live data
 * already showed at least one, "Ahmedabad store 2.0", that isn't in our seed).
 */
async function recordTransfer(outlet: Outlet, transfer: MappedTransfer): Promise<void> {
  const isSender = transfer.senderName?.toLowerCase() === outlet.name.toLowerCase();
  const isReceiver = transfer.receiverName?.toLowerCase() === outlet.name.toLowerCase();
  const transactionType = isSender
    ? InventoryTransactionType.TRANSFER_OUT
    : isReceiver
      ? InventoryTransactionType.TRANSFER_IN
      : InventoryTransactionType.ADJUSTMENT;

  for (const item of transfer.items) {
    await prisma.inventoryTransaction.create({
      data: {
        outletId: outlet.id,
        itemName: item.itemName,
        transactionType,
        quantity: item.quantity,
        unit: item.unit,
        referenceType: 'TRANSFER',
        referenceId: transfer.transferNumber,
        transactionDate: transfer.transferDate,
        rawPayload: transfer.rawPayload as object,
        source: DataSource.PETPOOJA,
      },
    });
  }
}

/**
 * Billing outlets (Capiche/Aiko/Bookends — only a salesSyncCode, no inventorySyncCode)
 * don't have a separate Purchase/Inventory API integration with Petpooja; their purchase
 * records come back through the SAME get_purchase/ endpoint but authenticated with the
 * SALES credential set and keyed by salesSyncCode instead — confirmed live via the API
 * Explorer (Settings > API Explorer > Purchase API) before wiring this into production sync.
 */
async function syncOutletPurchases(outlet: Outlet, fromDate: Date, toDate: Date): Promise<SyncOutletResult> {
  const isBilling = Boolean(outlet.salesSyncCode);
  const credentials = await resolveCredentials(isBilling ? ApiType.SALES : ApiType.PURCHASE);
  if (!credentials) throw new Error(`Petpooja ${isBilling ? 'Sales' : 'Purchase'} API is not configured`);

  const restID = isBilling ? outlet.salesSyncCode : outlet.inventorySyncCode;
  if (!restID) throw new Error('Outlet has no Sales/Purchase API sync code configured');

  const records = await fetchPurchases(credentials, restID, fromDate, toDate);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const isTransfer = isTransferRecord(record);
      if (isTransfer) {
        // Internal stock movements (e.g. Prep Kitchen -> outlet) have no external vendor,
        // but still represent real stock/value received into this outlet — so in addition
        // to the InventoryTransaction below (used for stock-level tracking), also surface
        // them on the Purchase Orders page, clearly labeled as internal rather than a real
        // vendor purchase, since "0 purchase orders" read as broken when this data exists.
        await recordTransfer(outlet, mapPetpoojaTransferFromPurchase(record));
      }

      const mapped = mapPetpoojaPurchase(record);
      const result = await upsertPurchaseOrder(outlet.id, {
        ...mapped,
        vendorName: isTransfer ? `${mapped.vendorName ?? 'Internal'} (Internal Transfer)` : mapped.vendorName,
      });
      if (result === 'created') created++;
      else updated++;
    } catch {
      failed++;
    }
  }

  return { fetched: records.length, created, updated, failed };
}

export async function runPurchaseSync(
  triggerType: TriggerType,
  fromDate: Date,
  toDate: Date,
  triggeredByUserId?: string,
  outletIds?: string[]
): Promise<SyncRunSummary> {
  const outlets = await prisma.outlet.findMany({
    where: {
      isActive: true,
      OR: [{ inventorySyncCode: { not: null } }, { salesSyncCode: { not: null } }],
      ...(outletIds ? { id: { in: outletIds } } : {}),
    },
  });

  return runSync('PURCHASE', triggerType, outlets, (outlet) => syncOutletPurchases(outlet, fromDate, toDate), triggeredByUserId);
}
