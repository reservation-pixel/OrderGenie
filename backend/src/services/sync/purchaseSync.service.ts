import type { Outlet } from '@prisma/client';
import { ApiType, TriggerType } from '@prisma/client';
import { prisma } from '../../config/db';
import { resolveCredentials } from '../petpooja/credentials';
import { fetchPurchases } from '../petpooja/purchaseApi.service';
import { isTransferRecord, mapPetpoojaPurchase, type MappedPurchase } from '../petpooja/mappers/purchaseMapper';
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

  // Keyed on petpoojaPurchaseId (Petpooja's own immutable ID), not poNumber — poNumber
  // can change value (e.g. once Petpooja starts/stops supplying a reference number for
  // a record), so it isn't safe as an upsert lookup key; petpoojaPurchaseId is stable.
  const existing = await prisma.purchaseOrder.findUnique({
    where: { outletId_petpoojaPurchaseId: { outletId, petpoojaPurchaseId: purchase.petpoojaPurchaseId } },
    select: { id: true },
  });

  const scalarData = {
    poNumber: purchase.poNumber,
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
    data: { outletId, status, ...scalarData, items: { create: items } },
  });
  return 'created';
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
      // Internal stock movements (e.g. Prep Kitchen -> outlet) have no external vendor,
      // but still represent real stock/value received into this outlet — surface them on
      // the Purchase Orders page, clearly labeled as internal rather than a real vendor
      // purchase, since "0 purchase orders" read as broken when this data exists. No
      // longer written to InventoryTransaction — stock-level tracking was dropped.
      const isTransfer = isTransferRecord(record);
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
