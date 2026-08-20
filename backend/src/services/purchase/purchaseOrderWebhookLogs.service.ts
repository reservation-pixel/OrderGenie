import { Prisma, PurchaseOrderStatus, WebhookOutcome } from '@prisma/client';
import { prisma } from '../../config/db';
import { parsePagination, toSkipTake, paginationMeta } from '../../utils/pagination';
import { resolveDateRange } from '../../utils/dateRange';
import { AppError } from '../../utils/apiResponse';

export interface PurchaseOrderWebhookLogQuery {
  outletId?: string;
  outcome?: string;
  status?: string;
  range?: string;
  from?: string;
  to?: string;
  page?: string;
  pageSize?: string;
  search?: string;
}

export async function listPurchaseOrderWebhookLogs(query: PurchaseOrderWebhookLogQuery) {
  const pagination = parsePagination(query as unknown as Record<string, unknown>);
  const { from, to } = resolveDateRange(query);

  const where: Prisma.PurchaseOrderWebhookLogWhereInput = {
    ...(query.outletId === 'unresolved'
      ? { outletId: null }
      : query.outletId
        ? { outletId: query.outletId }
        : {}),
    ...(query.outcome ? { outcome: query.outcome as WebhookOutcome } : {}),
    ...(query.status ? { status: query.status as PurchaseOrderStatus } : {}),
    ...(query.search
      ? {
          OR: [
            { poNumber: { contains: query.search, mode: 'insensitive' as const } },
            { petpoojaPurchaseId: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    receivedAt: { gte: from, lte: to },
  };

  const [rows, total] = await Promise.all([
    prisma.purchaseOrderWebhookLog.findMany({
      where,
      include: { outlet: { select: { name: true } } },
      orderBy: { receivedAt: 'desc' },
      ...toSkipTake(pagination),
    }),
    prisma.purchaseOrderWebhookLog.count({ where }),
  ]);

  return {
    rows: rows.map((log) => ({
      id: log.id,
      receivedAt: log.receivedAt,
      outletId: log.outletId,
      outletName: log.outlet?.name ?? null,
      petpoojaPurchaseId: log.petpoojaPurchaseId,
      poNumber: log.poNumber,
      menuSharingCode: log.menuSharingCode,
      outcome: log.outcome,
      httpStatusCode: log.httpStatusCode,
      failureReason: log.failureReason,
      status: log.status,
      writeResult: log.writeResult,
    })),
    meta: paginationMeta(pagination, total),
  };
}

export async function getPurchaseOrderWebhookLogById(id: string) {
  const log = await prisma.purchaseOrderWebhookLog.findUnique({
    where: { id },
    include: { outlet: { select: { name: true } } },
  });
  if (!log) throw new AppError('Webhook log not found', 404);

  const purchaseOrder = log.purchaseOrderId
    ? await prisma.purchaseOrder.findUnique({
        where: { id: log.purchaseOrderId },
        select: { id: true, poNumber: true, status: true, orderDate: true, updatedAt: true },
      })
    : null;

  return {
    id: log.id,
    receivedAt: log.receivedAt,
    outletId: log.outletId,
    outletName: log.outlet?.name ?? null,
    petpoojaPurchaseId: log.petpoojaPurchaseId,
    poNumber: log.poNumber,
    menuSharingCode: log.menuSharingCode,
    outcome: log.outcome,
    httpStatusCode: log.httpStatusCode,
    failureReason: log.failureReason,
    status: log.status,
    writeResult: log.writeResult,
    rawPayload: log.rawPayload,
    currentPurchaseOrder: purchaseOrder
      ? {
          id: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber,
          status: purchaseOrder.status,
          orderDate: purchaseOrder.orderDate,
          updatedAt: purchaseOrder.updatedAt,
        }
      : log.purchaseOrderId
        ? { pruned: true, id: log.purchaseOrderId }
        : null,
  };
}
