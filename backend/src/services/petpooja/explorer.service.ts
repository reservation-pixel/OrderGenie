import { ApiType } from '@prisma/client';
import { prisma } from '../../config/db';
import { resolveCredentials } from './credentials';
import { fetchPurchasesInRange, MAX_RANGE_DAYS } from './purchaseApi.service';
import { fetchOrdersRaw, fetchTransfersRaw } from './explorerApi.service';
import { AppError } from '../../utils/apiResponse';
import type { PetpoojaCredentials } from './types';

export type ExplorerApiType = 'orders' | 'purchase' | 'transfer';

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function eachDateInclusive(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

interface OutletLite {
  id: string;
  name: string;
  salesSyncCode: string | null;
  inventorySyncCode: string | null;
}

function isEligible(outlet: OutletLite, apiType: ExplorerApiType): boolean {
  if (apiType === 'orders') return Boolean(outlet.salesSyncCode);
  if (apiType === 'transfer') return Boolean(outlet.inventorySyncCode);
  return Boolean(outlet.salesSyncCode || outlet.inventorySyncCode); // purchase
}

export interface ExplorerOutletResult {
  outletId: string;
  outletName: string;
  count: number;
  error?: string;
}

export interface ExplorerResult {
  apiType: ExplorerApiType;
  recordCount: number;
  outletsRequested: number;
  outletsWithData: number;
  apiCallCount: number;
  elapsedMs: number;
  totalValue: number;
  perOutlet: ExplorerOutletResult[];
  records: unknown[];
}

export interface ExplorerFetchParams {
  apiType: ExplorerApiType;
  outletIds: string[];
  fromDate: Date;
  toDate: Date;
}

function mapOrderRecord(outlet: OutletLite, record: Awaited<ReturnType<typeof fetchOrdersRaw>>[number]) {
  const items = (record.OrderItem ?? []).map((i) => ({
    name: i.name ?? 'Unknown',
    category: i.categoryname ?? null,
    quantity: num(i.quantity),
    rate: num(i.price),
    discount: num(i.total_discount),
    amount: num(i.total),
  }));

  return {
    outletId: outlet.id,
    outletName: outlet.name,
    orderId: record.Order.orderID,
    date: record.Order.order_date ?? null,
    orderType: record.Order.order_type ?? null,
    paymentType: record.Order.payment_type ?? null,
    status: record.Order.status ?? null,
    total: num(record.Order.total),
    items,
  };
}

function mapPurchaseRecord(outlet: OutletLite, record: Awaited<ReturnType<typeof fetchPurchasesInRange>>[number]) {
  const items = (record.item_details ?? []).map((i) => ({
    name: i.itemname ?? 'Unknown',
    category: (i.category as string | undefined) ?? null,
    quantity: num(i.qty),
    unit: i.lbl_unit ?? null,
    rate: num(i.price),
    discount: num(i.discount),
    amount: num(i.amount),
  }));

  return {
    outletId: outlet.id,
    outletName: outlet.name,
    purchaseId: record.purchase_id,
    type: record.type ?? null,
    invoiceNumber: record.invoice_number || null,
    invoiceDate: record.invoice_date ?? null,
    supplierName: record.restaurant_details?.receiver?.receiver_name ?? null,
    total: num(record.total),
    payment: record.payment ?? null,
    status: record.action_status ?? null,
    items,
  };
}

async function resolveOutlets(outletIds: string[], apiType: ExplorerApiType): Promise<OutletLite[]> {
  const outlets = await prisma.outlet.findMany({
    where: { id: { in: outletIds }, isActive: true },
    select: { id: true, name: true, salesSyncCode: true, inventorySyncCode: true },
  });
  return outlets.filter((o) => isEligible(o, apiType));
}

async function runOrdersExplorer(outlets: OutletLite[], fromDate: Date, toDate: Date): Promise<ExplorerResult> {
  const started = Date.now();
  const credentials = await resolveCredentials(ApiType.SALES);
  if (!credentials) throw new AppError('Petpooja Sales API is not configured', 422);

  let apiCallCount = 0;
  const records: unknown[] = [];
  const perOutlet: ExplorerOutletResult[] = [];
  const dates = eachDateInclusive(fromDate, toDate);

  for (const outlet of outlets) {
    let count = 0;
    try {
      for (const date of dates) {
        const orders = await fetchOrdersRaw(credentials, outlet.salesSyncCode!, date, () => apiCallCount++);
        for (const order of orders) {
          records.push(mapOrderRecord(outlet, order));
          count++;
        }
      }
      perOutlet.push({ outletId: outlet.id, outletName: outlet.name, count });
    } catch (err) {
      perOutlet.push({ outletId: outlet.id, outletName: outlet.name, count, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const totalValue = records.reduce((s: number, r) => s + (r as { total: number }).total, 0);

  return {
    apiType: 'orders',
    recordCount: records.length,
    outletsRequested: outlets.length,
    outletsWithData: perOutlet.filter((o) => o.count > 0).length,
    apiCallCount,
    elapsedMs: Date.now() - started,
    totalValue,
    perOutlet,
    records,
  };
}

async function runPurchaseExplorer(outlets: OutletLite[], fromDate: Date, toDate: Date): Promise<ExplorerResult> {
  const started = Date.now();
  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new AppError(`Date range must be ${MAX_RANGE_DAYS} days or less (Petpooja's own limit) — got ${rangeDays} days`, 422);
  }

  const salesCreds = await resolveCredentials(ApiType.SALES);
  const purchaseCreds = await resolveCredentials(ApiType.PURCHASE);

  let apiCallCount = 0;
  const records: unknown[] = [];
  const perOutlet: ExplorerOutletResult[] = [];

  for (const outlet of outlets) {
    const isBilling = Boolean(outlet.salesSyncCode);
    const credentials: PetpoojaCredentials | null = isBilling ? salesCreds : purchaseCreds;
    const restID = isBilling ? outlet.salesSyncCode! : outlet.inventorySyncCode!;

    if (!credentials) {
      perOutlet.push({
        outletId: outlet.id,
        outletName: outlet.name,
        count: 0,
        error: `Petpooja ${isBilling ? 'Sales' : 'Purchase'} API is not configured`,
      });
      continue;
    }

    let count = 0;
    try {
      const purchases = await fetchPurchasesInRange(credentials, restID, fromDate, toDate, () => apiCallCount++);
      for (const purchase of purchases) {
        records.push(mapPurchaseRecord(outlet, purchase));
        count++;
      }
      perOutlet.push({ outletId: outlet.id, outletName: outlet.name, count });
    } catch (err) {
      perOutlet.push({ outletId: outlet.id, outletName: outlet.name, count, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const totalValue = records.reduce((s: number, r) => s + (r as { total: number }).total, 0);

  return {
    apiType: 'purchase',
    recordCount: records.length,
    outletsRequested: outlets.length,
    outletsWithData: perOutlet.filter((o) => o.count > 0).length,
    apiCallCount,
    elapsedMs: Date.now() - started,
    totalValue,
    perOutlet,
    records,
  };
}

async function runTransferExplorer(outlets: OutletLite[], fromDate: Date, toDate: Date): Promise<ExplorerResult> {
  const started = Date.now();
  const credentials = await resolveCredentials(ApiType.PURCHASE);
  if (!credentials) throw new AppError('Petpooja Purchase/Inventory API is not configured (Transfer reuses these credentials)', 422);

  let apiCallCount = 0;
  const records: unknown[] = [];
  const perOutlet: ExplorerOutletResult[] = [];

  for (const outlet of outlets) {
    apiCallCount++;
    const result = await fetchTransfersRaw(credentials, outlet.inventorySyncCode!, fromDate, toDate);
    if (result.success) {
      for (const record of result.records) {
        records.push({ outletId: outlet.id, outletName: outlet.name, raw: record });
      }
      perOutlet.push({ outletId: outlet.id, outletName: outlet.name, count: result.records.length });
    } else {
      perOutlet.push({
        outletId: outlet.id,
        outletName: outlet.name,
        count: 0,
        error: `${result.message ?? 'Request failed'}${result.errorCode ? ` (${result.errorCode})` : ''}`,
      });
    }
  }

  return {
    apiType: 'transfer',
    recordCount: records.length,
    outletsRequested: outlets.length,
    outletsWithData: perOutlet.filter((o) => o.count > 0).length,
    apiCallCount,
    elapsedMs: Date.now() - started,
    totalValue: 0,
    perOutlet,
    records,
  };
}

export async function runExplorerFetch({ apiType, outletIds, fromDate, toDate }: ExplorerFetchParams): Promise<ExplorerResult> {
  if (outletIds.length === 0) throw new AppError('Select at least one outlet', 422);
  if (fromDate > toDate) throw new AppError('From date must be before or equal to the to date', 422);

  const outlets = await resolveOutlets(outletIds, apiType);
  if (outlets.length === 0) throw new AppError('None of the selected outlets are eligible for this API', 422);

  switch (apiType) {
    case 'orders':
      return runOrdersExplorer(outlets, fromDate, toDate);
    case 'purchase':
      return runPurchaseExplorer(outlets, fromDate, toDate);
    case 'transfer':
      return runTransferExplorer(outlets, fromDate, toDate);
    default:
      throw new AppError('Unknown API type', 422);
  }
}
