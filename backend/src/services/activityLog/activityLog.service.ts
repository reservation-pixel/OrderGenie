import { Prisma, RoleName } from '@prisma/client';
import { prisma } from '../../config/db';
import { parsePagination, toSkipTake, paginationMeta } from '../../utils/pagination';
import { resolveDateRange } from '../../utils/dateRange';

/** Audit rows outlive the 7-day operational data, but not forever. */
export const ACTIVITY_LOG_RETENTION_DAYS = 90;

const REDACTED = '[redacted]';
// Anything whose name looks like a credential never reaches the log — payloads are
// captured wholesale, so this is an allowlist-by-exclusion on the way in, not on display.
const SECRET_KEY = /password|secret|token|apikey|api_key|accesskey|access_key|authorization/i;

export function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizePayload(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEY.test(key) ? REDACTED : sanitizePayload(v, depth + 1);
  }
  return out;
}

export interface ActivityDetail {
  action?: string;
  label?: string;
  outletId?: string | null;
  brand?: string | null;
  itemName?: string | null;
  stockDate?: Date | null;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
}

export interface RecordActivityInput extends ActivityDetail {
  userId?: string | null;
  userEmail: string;
  userRole?: RoleName | null;
  action: string;
  label: string;
  method: string;
  path: string;
  payload?: unknown;
  statusCode: number;
}

/**
 * Never throws: a failed audit write must not turn a successful save into an error for
 * the user, and the response has already been sent by the time this runs anyway.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        userEmail: input.userEmail,
        userRole: input.userRole ?? null,
        action: input.action,
        label: input.label,
        method: input.method,
        path: input.path,
        outletId: input.outletId ?? null,
        brand: input.brand ?? null,
        itemName: input.itemName ?? null,
        stockDate: input.stockDate ?? null,
        changes: (input.changes ?? undefined) as Prisma.InputJsonValue | undefined,
        payload: (sanitizePayload(input.payload) ?? undefined) as Prisma.InputJsonValue | undefined,
        statusCode: input.statusCode,
      },
    });
  } catch (error) {
    console.error('[activity-log] failed to record activity', error);
  }
}

export interface ActivityLogQuery {
  action?: string;
  userId?: string;
  outletId?: string;
  brand?: string;
  search?: string;
  range?: string;
  from?: string;
  to?: string;
  page?: string;
  pageSize?: string;
}

export async function listActivityLogs(query: ActivityLogQuery) {
  const pagination = parsePagination(query as unknown as Record<string, unknown>);
  const { from, to } = resolveDateRange(query);

  const where: Prisma.ActivityLogWhereInput = {
    createdAt: { gte: from, lte: to },
    ...(query.action ? { action: query.action } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.outletId ? { outletId: query.outletId } : {}),
    ...(query.brand ? { brand: query.brand } : {}),
    ...(query.search
      ? {
          OR: [
            { userEmail: { contains: query.search, mode: 'insensitive' as const } },
            { label: { contains: query.search, mode: 'insensitive' as const } },
            { itemName: { contains: query.search, mode: 'insensitive' as const } },
            { path: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(pagination) }),
    prisma.activityLog.count({ where }),
  ]);

  // Outlet names aren't denormalised onto the row (an outlet rename should show the current
  // name), and there are only a handful of outlets, so one lookup covers the whole page.
  const outletIds = Array.from(new Set(rows.map((r) => r.outletId).filter((id): id is string => Boolean(id))));
  const outlets = outletIds.length
    ? await prisma.outlet.findMany({ where: { id: { in: outletIds } }, select: { id: true, name: true } })
    : [];
  const outletNameById = new Map(outlets.map((o) => [o.id, o.name]));

  return {
    rows: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      userEmail: row.userEmail,
      userRole: row.userRole,
      action: row.action,
      label: row.label,
      method: row.method,
      path: row.path,
      outletId: row.outletId,
      outletName: row.outletId ? (outletNameById.get(row.outletId) ?? null) : null,
      brand: row.brand,
      itemName: row.itemName,
      stockDate: row.stockDate,
      changes: row.changes,
      payload: row.payload,
      statusCode: row.statusCode,
    })),
    meta: paginationMeta(pagination, total),
  };
}

/** The distinct users and actions present in the log, for the filter dropdowns. */
export async function getActivityLogFilters() {
  const [actions, users] = await Promise.all([
    prisma.activityLog.findMany({ select: { action: true, label: true }, distinct: ['action'], orderBy: { action: 'asc' } }),
    prisma.activityLog.findMany({
      where: { userId: { not: null } },
      select: { userId: true, userEmail: true },
      distinct: ['userId'],
      orderBy: { userEmail: 'asc' },
    }),
  ]);

  return {
    actions: actions.map((a) => ({ action: a.action, label: a.label })),
    users: users.map((u) => ({ id: u.userId as string, email: u.userEmail })),
  };
}
