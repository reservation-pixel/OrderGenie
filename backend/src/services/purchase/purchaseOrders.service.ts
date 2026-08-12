import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { parsePagination, toSkipTake, paginationMeta } from '../../utils/pagination';
import { resolveDateRange } from '../../utils/dateRange';
import { AppError } from '../../utils/apiResponse';

function toNum(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

export interface PurchaseOrderQuery {
  outletId?: string;
  brand?: string;
  status?: string;
  vendorId?: string;
  range?: string;
  from?: string;
  to?: string;
  page?: string;
  pageSize?: string;
  dateField?: string;
  search?: string;
}

export async function listPurchaseOrders(query: PurchaseOrderQuery) {
  const pagination = parsePagination(query as unknown as Record<string, unknown>);
  const { from, to } = resolveDateRange(query);
  const dateField = query.dateField === 'createdAt' ? 'createdAt' : 'orderDate';

  const where: Prisma.PurchaseOrderWhereInput = {
    ...(query.outletId ? { outletId: query.outletId } : {}),
    ...(query.brand ? { outlet: { brand: query.brand } } : {}),
    ...(query.status ? { status: query.status as PurchaseOrderStatus } : {}),
    ...(query.vendorId ? { vendorId: query.vendorId } : {}),
    ...(query.search ? { poNumber: { contains: query.search, mode: 'insensitive' as const } } : {}),
    [dateField]: { gte: from, lte: to },
  };

  const [rows, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: { outlet: { select: { name: true } }, vendor: { select: { name: true } } },
      orderBy: { orderDate: 'desc' },
      ...toSkipTake(pagination),
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    rows: rows.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      vendorName: po.vendor?.name ?? '—',
      outletId: po.outletId,
      outletName: po.outlet.name,
      status: po.status,
      totalAmount: toNum(po.totalAmount),
      orderDate: po.orderDate,
      expectedDate: po.expectedDate,
      createdAt: po.createdAt,
    })),
    meta: paginationMeta(pagination, total),
  };
}

export async function getPurchaseOrderById(id: string, restrictToOutletId?: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { outlet: { select: { name: true } }, vendor: true, items: true },
  });
  if (!po) throw new AppError('Purchase order not found', 404);
  if (restrictToOutletId && po.outletId !== restrictToOutletId) throw new AppError('Purchase order not found', 404);

  return {
    id: po.id,
    poNumber: po.poNumber,
    outletId: po.outletId,
    outletName: po.outlet.name,
    vendor: po.vendor
      ? { id: po.vendor.id, name: po.vendor.name, contactPerson: po.vendor.contactPerson, phone: po.vendor.phone }
      : null,
    invoiceNumber: po.invoiceNumber,
    status: po.status,
    totalAmount: toNum(po.totalAmount),
    taxAmount: toNum(po.taxAmount),
    orderDate: po.orderDate,
    expectedDate: po.expectedDate,
    receivedDate: po.receivedDate,
    items: po.items.map((i) => ({
      itemName: i.itemName,
      quantity: toNum(i.quantity),
      unit: i.unit,
      rate: toNum(i.rate),
      amount: toNum(i.amount),
      cgst: toNum(i.cgst),
      sgst: toNum(i.sgst),
      igst: toNum(i.igst),
      cess: toNum(i.cess),
      receivedQty: toNum(i.receivedQty),
      pendingQty: toNum(i.pendingQty),
    })),
  };
}
