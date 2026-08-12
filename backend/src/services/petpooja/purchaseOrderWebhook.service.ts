import { ApiType, PurchaseOrderStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError } from '../../utils/apiResponse';
import { resolveCredentials } from './credentials';
import { mapPurchaseOrderWebhook } from './mappers/purchaseOrderWebhookMapper';
import type { PetpoojaPurchaseOrderWebhookPayload } from './types';

/**
 * Petpooja's Inventory API docs state credentials "remain constant for all API
 * calls" — confirmed against a real onboarding email (apidocs/apidocs.txt), which
 * shows the same app_key/app_secret/access_token used for the Purchase (get_purchase)
 * API. So the webhook is verified against the same ApiType.PURCHASE credentials
 * already configured, rather than a separate credential set.
 *
 * Petpooja's own example payload has access_token/app_secret swapped (access_token
 * holds the app secret value and vice versa) — likely a docs typo, but worth
 * re-checking against a real webhook call before trusting this comparison.
 */
export async function verifyWebhookCredentials(payload: PetpoojaPurchaseOrderWebhookPayload): Promise<boolean> {
  const credentials = await resolveCredentials(ApiType.PURCHASE);
  if (!credentials) return false;
  return (
    payload.app_key === credentials.appKey &&
    payload.app_secret === credentials.appSecret &&
    payload.access_token === credentials.accessToken
  );
}

async function resolveVendorId(name: string | null): Promise<string | undefined> {
  if (!name) return undefined;
  const existing = await prisma.vendor.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.vendor.create({ data: { name } });
  return created.id;
}

export interface PurchaseOrderWebhookResult {
  outletId: string;
  purchaseOrderId: string;
  result: 'created' | 'updated';
}

/**
 * Petpooja calls this "menuSharingCode" (their term, used the same way across all
 * 14 Inventory API endpoints); it's the exact same per-outlet identifier this
 * codebase already stores as Outlet.inventorySyncCode for the Transfer/Purchase
 * APIs — confirmed against apidocs/apidocs.txt (real onboarding emails), where the
 * "Menu Sharing Sync Code" values match our seeded inventorySyncCode values
 * verbatim. No separate field needed.
 */
export async function handlePurchaseOrderWebhook(
  payload: PetpoojaPurchaseOrderWebhookPayload
): Promise<PurchaseOrderWebhookResult> {
  const menuSharingCode = payload.data.menuSharingCode ?? payload.menuSharingCode;
  const outlet = menuSharingCode ? await prisma.outlet.findFirst({ where: { inventorySyncCode: menuSharingCode } }) : null;
  if (!outlet) {
    throw new AppError(`No outlet configured with inventorySyncCode "${menuSharingCode ?? ''}"`, 422);
  }

  const mapped = mapPurchaseOrderWebhook(payload.data);
  const vendorId = await resolveVendorId(mapped.vendorName);
  const status = mapped.isCancelled ? PurchaseOrderStatus.CANCELLED : PurchaseOrderStatus.PENDING;

  const existing = await prisma.purchaseOrder.findUnique({
    where: { outletId_poNumber: { outletId: outlet.id, poNumber: mapped.poNumber } },
    select: { id: true },
  });

  const scalarData = {
    petpoojaPurchaseId: mapped.petpoojaPurchaseId,
    vendorId,
    invoiceNumber: mapped.invoiceNumber,
    status,
    totalAmount: mapped.totalAmount,
    taxAmount: mapped.taxAmount,
    orderDate: mapped.orderDate,
    expectedDate: mapped.expectedDate,
    rawPayload: mapped.rawPayload as object,
  };

  const items = mapped.items.map((i) => ({
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

  if (existing) {
    await prisma.purchaseOrder.update({
      where: { id: existing.id },
      data: { ...scalarData, items: { deleteMany: {}, create: items } },
    });
    return { outletId: outlet.id, purchaseOrderId: existing.id, result: 'updated' };
  }

  const created = await prisma.purchaseOrder.create({
    data: { outletId: outlet.id, poNumber: mapped.poNumber, ...scalarData, items: { create: items } },
  });
  return { outletId: outlet.id, purchaseOrderId: created.id, result: 'created' };
}
