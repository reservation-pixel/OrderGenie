import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { parsePagination, toSkipTake, paginationMeta } from '../../utils/pagination';
import { resolveDateRange } from '../../utils/dateRange';
import { AppError } from '../../utils/apiResponse';

function toNum(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

export interface InventoryQuery {
  outletId?: string;
  brand?: string;
  store?: string;
  category?: string;
  lowStockOnly?: string;
  range?: string;
  from?: string;
  to?: string;
  page?: string;
  pageSize?: string;
}

export async function listInventory(query: InventoryQuery) {
  // "As of" support: shows each item's latest snapshot on or before the selected
  // range's end date, instead of always the true latest. Presets like 'today'/
  // 'month' resolve `to` to end-of-today, which is a no-op cutoff (stock can't be
  // dated in the future) — only 'yesterday' or a custom range meaningfully differ.
  const { to: asOfDate } = resolveDateRange(query);

  const where: Prisma.InventoryWhereInput = {
    ...(query.outletId ? { outletId: query.outletId } : {}),
    ...(query.brand ? { outlet: { brand: query.brand } } : {}),
    ...(query.store ? { store: query.store } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.lowStockOnly === 'true' ? { isLowStock: true } : {}),
    stockDate: { lte: asOfDate },
  };

  // Latest snapshot per (outletId, itemName), as of the cutoff above
  const latestDates = await prisma.inventory.groupBy({
    by: ['outletId', 'itemName'],
    where,
    _max: { stockDate: true },
  });

  if (latestDates.length === 0) {
    const pagination = parsePagination(query as unknown as Record<string, unknown>);
    return { rows: [], meta: paginationMeta(pagination, 0) };
  }

  const allLatest = await prisma.inventory.findMany({
    where: {
      OR: latestDates.map((d) => ({ outletId: d.outletId, itemName: d.itemName, stockDate: d._max.stockDate! })),
    },
    include: { outlet: { select: { id: true, name: true } } },
    orderBy: [{ isLowStock: 'desc' }, { itemName: 'asc' }],
  });

  const pagination = parsePagination(query as unknown as Record<string, unknown>);
  const total = allLatest.length;
  const { skip, take } = toSkipTake(pagination);
  const page = allLatest.slice(skip, skip + take);

  return {
    rows: page.map((i) => ({
      id: i.id,
      outletId: i.outletId,
      outletName: i.outlet.name,
      itemName: i.itemName,
      category: i.category,
      store: i.store,
      unit: i.unit,
      openingStock: toNum(i.openingStock),
      purchasedQty: toNum(i.purchasedQty),
      consumedQty: toNum(i.consumedQty),
      closingStock: toNum(i.closingStock),
      currentStock: toNum(i.currentStock),
      stockValue: toNum(i.stockValue),
      isLowStock: i.isLowStock,
      stockDate: i.stockDate,
      source: i.source,
    })),
    meta: paginationMeta(pagination, total),
  };
}

export async function getInventoryById(id: string, restrictToOutletId?: string) {
  const row = await prisma.inventory.findUnique({
    where: { id },
    include: { outlet: { select: { id: true, name: true } } },
  });
  if (!row) throw new AppError('Inventory item not found', 404);
  if (restrictToOutletId && row.outletId !== restrictToOutletId) throw new AppError('Inventory item not found', 404);

  const history = await prisma.inventoryTransaction.findMany({
    where: { outletId: row.outletId, itemName: row.itemName },
    orderBy: { transactionDate: 'desc' },
    take: 30,
  });

  return {
    id: row.id,
    outletId: row.outletId,
    outletName: row.outlet.name,
    itemName: row.itemName,
    category: row.category,
    store: row.store,
    unit: row.unit,
    openingStock: toNum(row.openingStock),
    purchasedQty: toNum(row.purchasedQty),
    consumedQty: toNum(row.consumedQty),
    closingStock: toNum(row.closingStock),
    currentStock: toNum(row.currentStock),
    stockValue: toNum(row.stockValue),
    isLowStock: row.isLowStock,
    stockDate: row.stockDate,
    source: row.source,
    history: history.map((h) => ({
      transactionType: h.transactionType,
      quantity: toNum(h.quantity),
      unit: h.unit,
      transactionDate: h.transactionDate,
    })),
  };
}

export async function listInventoryStores(): Promise<string[]> {
  const rows = await prisma.inventory.findMany({ where: { store: { not: null } }, select: { store: true }, distinct: ['store'] });
  return rows.map((r) => r.store!).sort();
}

export async function listInventoryCategories(): Promise<string[]> {
  const rows = await prisma.inventory.findMany({ where: { category: { not: null } }, select: { category: true }, distinct: ['category'] });
  return rows.map((r) => r.category!).sort();
}
