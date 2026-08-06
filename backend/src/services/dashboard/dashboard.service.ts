import { prisma } from '../../config/db';
import { resolveDateRange } from '../../utils/dateRange';

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

function dayBounds(d: Date) {
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

export async function getDashboard(outletId?: string, rangeQuery?: { range?: string; from?: string; to?: string }) {
  const where = outletId ? { outletId } : {};
  const now = new Date();
  const today = dayBounds(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayBounds(yesterdayDate);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // KPI cards below are always fixed to their named real-world periods (today/
  // yesterday/this month), independent of the caller's selected range — only the
  // charts (salesTrend/outletComparison/topSellingItems/hourlySales/paymentBreakdown)
  // reflect the selected range.
  const { from: rangeFrom, to: rangeTo } = resolveDateRange(rangeQuery ?? {});

  const [todayAgg, yesterdayAgg, monthAgg, inventoryAgg, poCount, lowStockCount, rangedSales, outlets, rangedSaleItems, paymentAgg] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { ...where, orderDateTime: { gte: today.from, lt: today.to } },
        _sum: { netAmount: true, discountAmount: true, taxAmount: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { ...where, orderDateTime: { gte: yesterday.from, lt: yesterday.to } },
        _sum: { netAmount: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { ...where, orderDateTime: { gte: monthStart } },
        _sum: { netAmount: true, discountAmount: true, taxAmount: true },
        _count: true,
      }),
      prisma.inventory.groupBy({
        by: ['outletId', 'itemName'],
        where,
        _max: { stockDate: true },
      }),
      prisma.purchaseOrder.count({ where: { ...where, status: { in: ['PENDING', 'PARTIALLY_RECEIVED', 'DRAFT'] } } }),
      prisma.inventory.count({ where: { ...where, isLowStock: true } }),
      prisma.sale.findMany({
        where: { ...where, orderDateTime: { gte: rangeFrom, lte: rangeTo } },
        select: { orderDateTime: true, orderDate: true, netAmount: true, outletId: true },
      }),
      prisma.outlet.findMany({ where: { isActive: true, outletType: 'OUTLET' }, select: { id: true, name: true } }),
      prisma.saleItem.findMany({
        where: { sale: { ...where, orderDateTime: { gte: rangeFrom, lte: rangeTo } } },
        select: { itemName: true, quantity: true, total: true },
      }),
      prisma.sale.groupBy({
        by: ['paymentMode'],
        where: { ...where, orderDateTime: { gte: rangeFrom, lte: rangeTo } },
        _sum: { netAmount: true },
      }),
    ]);

  // Inventory value: sum stockValue of the latest snapshot per (outlet, item)
  const latestKeys = inventoryAgg.map((r) => ({ outletId: r.outletId, itemName: r.itemName, stockDate: r._max.stockDate! }));
  let inventoryValue = 0;
  if (latestKeys.length > 0) {
    const latestRows = await prisma.inventory.findMany({
      where: {
        OR: latestKeys.map((k) => ({ outletId: k.outletId, itemName: k.itemName, stockDate: k.stockDate })),
      },
      select: { stockValue: true },
    });
    inventoryValue = latestRows.reduce((s, r) => s + toNum(r.stockValue), 0);
  }

  const salesTrendMap = new Map<string, number>();
  for (const s of rangedSales) {
    const key = s.orderDate.toISOString().slice(0, 10);
    salesTrendMap.set(key, (salesTrendMap.get(key) ?? 0) + toNum(s.netAmount));
  }
  const salesTrend = Array.from(salesTrendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  // Sales by hour-of-day, summed across every day in the selected range.
  const hourlyMap = new Map<number, number>();
  for (const s of rangedSales) {
    const hour = s.orderDateTime.getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + toNum(s.netAmount));
  }
  const hourlySales = Array.from({ length: 24 }, (_, hour) => ({ hour, amount: hourlyMap.get(hour) ?? 0 }));

  const outletComparison = await Promise.all(
    outlets.map(async (o) => {
      const agg = rangedSales.filter((s) => s.outletId === o.id).reduce((s, r) => s + toNum(r.netAmount), 0);
      return { outletId: o.id, outletName: o.name, revenue: agg };
    })
  );

  const topItemsMap = new Map<string, { quantity: number; revenue: number }>();
  for (const i of rangedSaleItems) {
    const cur = topItemsMap.get(i.itemName) ?? { quantity: 0, revenue: 0 };
    cur.quantity += toNum(i.quantity);
    cur.revenue += toNum(i.total);
    topItemsMap.set(i.itemName, cur);
  }
  const topSellingItems = Array.from(topItemsMap.entries())
    .map(([itemName, v]) => ({ itemName, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const paymentBreakdown = paymentAgg.map((p) => ({ paymentMode: p.paymentMode, amount: toNum(p._sum.netAmount) }));

  return {
    kpis: {
      todaySales: toNum(todayAgg._sum.netAmount),
      todayOrders: todayAgg._count,
      yesterdaySales: toNum(yesterdayAgg._sum.netAmount),
      monthlySales: toNum(monthAgg._sum.netAmount),
      monthlyOrders: monthAgg._count,
      averageBill: monthAgg._count > 0 ? toNum(monthAgg._sum.netAmount) / monthAgg._count : 0,
      discounts: toNum(monthAgg._sum.discountAmount),
      taxes: toNum(monthAgg._sum.taxAmount),
      inventoryValue,
      purchaseOrders: poCount,
      lowStockItems: lowStockCount,
    },
    charts: {
      salesTrend,
      outletComparison,
      topSellingItems,
      hourlySales,
      paymentBreakdown,
    },
  };
}
