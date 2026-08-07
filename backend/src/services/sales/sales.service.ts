import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { resolveDateRange } from '../../utils/dateRange';
import { parsePagination, toSkipTake, paginationMeta } from '../../utils/pagination';
import { AppError } from '../../utils/apiResponse';

function toNum(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

export interface SalesQuery {
  outletId?: string;
  brand?: string;
  range?: string;
  from?: string;
  to?: string;
  paymentMode?: string;
  page?: string;
  pageSize?: string;
}

export async function listSales(query: SalesQuery) {
  const { from, to } = resolveDateRange(query);
  const pagination = parsePagination(query as unknown as Record<string, unknown>);

  const where: Prisma.SaleWhereInput = {
    orderDateTime: { gte: from, lte: to },
    ...(query.outletId ? { outletId: query.outletId } : {}),
    ...(query.brand ? { outlet: { brand: query.brand } } : {}),
    ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { outlet: { select: { id: true, name: true } } },
      orderBy: { orderDateTime: 'desc' },
      ...toSkipTake(pagination),
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    rows: rows.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      outletId: s.outletId,
      outletName: s.outlet.name,
      date: s.orderDate,
      time: s.orderDateTime,
      customer: s.customerName,
      gross: toNum(s.grossAmount),
      discount: toNum(s.discountAmount),
      tax: toNum(s.taxAmount),
      net: toNum(s.netAmount),
      paymentMode: s.paymentMode,
    })),
    meta: paginationMeta(pagination, total),
  };
}

export async function getSaleById(id: string, restrictToOutletId?: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { outlet: { select: { id: true, name: true } }, items: true },
  });
  if (!sale) throw new AppError('Sale not found', 404);
  if (restrictToOutletId && sale.outletId !== restrictToOutletId) throw new AppError('Sale not found', 404);

  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    outletId: sale.outletId,
    outletName: sale.outlet.name,
    date: sale.orderDate,
    time: sale.orderDateTime,
    customer: sale.customerName,
    customerPhone: sale.customerPhone,
    gross: toNum(sale.grossAmount),
    discount: toNum(sale.discountAmount),
    tax: toNum(sale.taxAmount),
    net: toNum(sale.netAmount),
    paymentMode: sale.paymentMode,
    orderType: sale.orderType,
    items: sale.items.map((i) => ({
      itemName: i.itemName,
      category: i.category,
      quantity: toNum(i.quantity),
      price: toNum(i.price),
      discount: toNum(i.discount),
      tax: toNum(i.tax),
      total: toNum(i.total),
    })),
  };
}

export interface ItemSalesQuery {
  outletId?: string;
  brand?: string;
  range?: string;
  from?: string;
  to?: string;
  category?: string;
  search?: string;
  sort?: 'top' | 'least';
  page?: string;
  pageSize?: string;
}

export interface ItemAggregateRow {
  itemName: string;
  category: string | null;
  quantitySold: number;
  revenue: number;
  averagePrice: number;
  discount: number;
  tax: number;
}

/**
 * Fetches SaleItem rows for the given scope/date-range and groups them by itemName.
 * Shared by listItemSales (which additionally sorts/paginates) and the Class A Items
 * summary (which resolves curated item/category watchlist entries against the full set).
 */
export async function aggregateItemSales(params: {
  outletId?: string;
  brand?: string;
  from: Date;
  to: Date;
  category?: string;
  search?: string;
}): Promise<ItemAggregateRow[]> {
  const items = await prisma.saleItem.findMany({
    where: {
      sale: {
        orderDateTime: { gte: params.from, lte: params.to },
        ...(params.outletId ? { outletId: params.outletId } : {}),
        ...(params.brand ? { outlet: { brand: params.brand } } : {}),
      },
      ...(params.category ? { category: params.category } : {}),
      ...(params.search ? { itemName: { contains: params.search, mode: 'insensitive' } } : {}),
    },
    select: { itemName: true, category: true, quantity: true, price: true, discount: true, tax: true, total: true },
  });

  const grouped = new Map<
    string,
    { itemName: string; category: string | null; quantitySold: number; revenue: number; discount: number; tax: number; priceSum: number; count: number }
  >();

  for (const i of items) {
    const key = i.itemName;
    const cur = grouped.get(key) ?? {
      itemName: i.itemName,
      category: i.category,
      quantitySold: 0,
      revenue: 0,
      discount: 0,
      tax: 0,
      priceSum: 0,
      count: 0,
    };
    cur.quantitySold += toNum(i.quantity);
    cur.revenue += toNum(i.total);
    cur.discount += toNum(i.discount);
    cur.tax += toNum(i.tax);
    cur.priceSum += toNum(i.price);
    cur.count += 1;
    grouped.set(key, cur);
  }

  return Array.from(grouped.values()).map((r) => ({
    itemName: r.itemName,
    category: r.category,
    quantitySold: r.quantitySold,
    revenue: r.revenue,
    averagePrice: r.count > 0 ? r.priceSum / r.count : 0,
    discount: r.discount,
    tax: r.tax,
  }));
}

export async function listItemSales(query: ItemSalesQuery) {
  const { from, to } = resolveDateRange(query);

  let rows = await aggregateItemSales({
    outletId: query.outletId,
    brand: query.brand,
    from,
    to,
    category: query.category,
    search: query.search,
  });

  rows.sort((a, b) => (query.sort === 'least' ? a.quantitySold - b.quantitySold : b.quantitySold - a.quantitySold));

  const pagination = parsePagination(query as unknown as Record<string, unknown>);
  const total = rows.length;
  const { skip, take } = toSkipTake(pagination);
  rows = rows.slice(skip, skip + take);

  return { rows, meta: paginationMeta(pagination, total) };
}

export async function listItemCategories(): Promise<string[]> {
  const rows = await prisma.saleItem.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ['category'],
  });
  return rows.map((r) => r.category!).sort();
}

export async function getItemDetail(itemName: string, query: { outletId?: string }) {
  const now = new Date();
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const items = await prisma.saleItem.findMany({
    where: {
      itemName,
      sale: {
        orderDateTime: { gte: since },
        ...(query.outletId ? { outletId: query.outletId } : {}),
      },
    },
    include: { sale: { select: { orderDate: true, orderDateTime: true, outletId: true, outlet: { select: { name: true } } } } },
  });

  if (items.length === 0) throw new AppError('Item not found in sales history', 404);

  const dailyMap = new Map<string, number>();
  const weeklyMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();
  const outletMap = new Map<string, { outletName: string; revenue: number; quantity: number }>();
  const hourMap = new Map<number, number>();

  for (const i of items) {
    const d = i.sale.orderDate;
    const dayKey = d.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + toNum(i.total));

    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + toNum(i.total));

    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + toNum(i.total));

    const outletKey = i.sale.outletId;
    const outletCur = outletMap.get(outletKey) ?? { outletName: i.sale.outlet.name, revenue: 0, quantity: 0 };
    outletCur.revenue += toNum(i.total);
    outletCur.quantity += toNum(i.quantity);
    outletMap.set(outletKey, outletCur);

    const hour = i.sale.orderDateTime.getHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + toNum(i.quantity));
  }

  const sortedEntries = (m: Map<string, number>) =>
    Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

  return {
    itemName,
    dailyTrend: sortedEntries(dailyMap),
    weeklyTrend: sortedEntries(weeklyMap),
    monthlyTrend: sortedEntries(monthlyMap),
    outletComparison: Array.from(outletMap.entries()).map(([outletId, v]) => ({ outletId, ...v })),
    peakHours: Array.from({ length: 24 }, (_, hour) => ({ hour, quantity: hourMap.get(hour) ?? 0 })),
  };
}
