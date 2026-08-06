import type { Outlet } from '@prisma/client';
import { ApiType, TriggerType } from '@prisma/client';
import { prisma } from '../../config/db';
import { resolveCredentials } from '../petpooja/credentials';
import { fetchOrdersForDate } from '../petpooja/salesApi.service';
import { mapPetpoojaOrder } from '../petpooja/mappers/salesMapper';
import { runSync, type SyncOutletResult, type SyncRunSummary } from './syncRunner.service';

async function upsertSale(outletId: string, order: ReturnType<typeof mapPetpoojaOrder>): Promise<'created' | 'updated'> {
  const existing = await prisma.sale.findUnique({
    where: { outletId_invoiceNumber: { outletId, invoiceNumber: order.invoiceNumber } },
    select: { id: true },
  });

  const scalarData = {
    petpoojaOrderId: order.petpoojaOrderId,
    orderDateTime: order.orderDateTime,
    orderDate: order.orderDate,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    grossAmount: order.grossAmount,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    netAmount: order.netAmount,
    paymentMode: order.paymentMode,
    orderType: order.orderType,
    rawPayload: order.rawPayload as object,
  };

  if (existing) {
    await prisma.sale.update({
      where: { id: existing.id },
      data: {
        ...scalarData,
        items: { deleteMany: {}, create: order.items },
      },
    });
    return 'updated';
  }

  await prisma.sale.create({
    data: {
      outletId,
      invoiceNumber: order.invoiceNumber,
      ...scalarData,
      items: { create: order.items },
    },
  });
  return 'created';
}

async function syncOutletSales(outlet: Outlet, targetDate: Date): Promise<SyncOutletResult> {
  const credentials = await resolveCredentials(ApiType.SALES);
  if (!credentials) throw new Error('Petpooja Sales API is not configured');
  if (!outlet.salesSyncCode) throw new Error('Outlet has no Sales API sync code configured');

  const orders = await fetchOrdersForDate(credentials, outlet.salesSyncCode, targetDate);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const rawOrder of orders) {
    try {
      const mapped = mapPetpoojaOrder(rawOrder);
      const result = await upsertSale(outlet.id, mapped);
      if (result === 'created') created++;
      else updated++;
    } catch {
      failed++;
    }
  }

  return { fetched: orders.length, created, updated, failed };
}

export async function runSalesSync(
  triggerType: TriggerType,
  targetDate: Date,
  triggeredByUserId?: string,
  outletIds?: string[]
): Promise<SyncRunSummary> {
  const outlets = await prisma.outlet.findMany({
    where: {
      isActive: true,
      salesSyncCode: { not: null },
      ...(outletIds ? { id: { in: outletIds } } : {}),
    },
  });

  return runSync('SALES', triggerType, outlets, (outlet) => syncOutletSales(outlet, targetDate), triggeredByUserId);
}
