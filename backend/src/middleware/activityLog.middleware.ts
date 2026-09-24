import type { NextFunction, Request, Response } from 'express';
import { recordActivity, type ActivityDetail } from '../services/activityLog/activityLog.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface ActionRule {
  method: string;
  pattern: RegExp;
  action: string;
  label: string;
}

/**
 * Human labels for the endpoints worth naming. Anything unmatched still gets logged under a
 * generated action key, so a new endpoint is never silently missing from the audit trail —
 * it just reads as "POST /api/…" until someone adds it here.
 */
const ACTION_RULES: ActionRule[] = [
  { method: 'POST', pattern: /^\/api\/auth\/login$/, action: 'auth.login', label: 'Signed in' },
  { method: 'POST', pattern: /^\/api\/reconciliation\/entries$/, action: 'reconciliation.entry.save', label: 'Saved reconciliation entry' },
  { method: 'DELETE', pattern: /^\/api\/reconciliation\/entries\/openings$/, action: 'reconciliation.openings.clear', label: 'Cleared all openings for the day' },
  { method: 'DELETE', pattern: /^\/api\/reconciliation\/entries\/closings$/, action: 'reconciliation.closings.clear', label: 'Cleared all closings for the day' },
  { method: 'PUT', pattern: /^\/api\/reconciliation\/order$/, action: 'reconciliation.order.save', label: 'Reordered reconciliation items' },
  { method: 'POST', pattern: /^\/api\/class-a-items$/, action: 'class-a-items.add', label: 'Added a Class A item' },
  { method: 'PUT', pattern: /^\/api\/class-a-items\/purchase-aliases$/, action: 'class-a-items.aliases.save', label: 'Updated purchase names' },
  { method: 'DELETE', pattern: /^\/api\/class-a-items\/[^/]+$/, action: 'class-a-items.remove', label: 'Removed a Class A item' },
  { method: 'POST', pattern: /^\/api\/sold-out\/entries$/, action: 'sold-out.entry.save', label: 'Saved a sold-out entry' },
  { method: 'POST', pattern: /^\/api\/wastage$/, action: 'wastage.create', label: 'Logged wastage' },
  { method: 'DELETE', pattern: /^\/api\/wastage\/[^/]+$/, action: 'wastage.delete', label: 'Deleted a wastage entry' },
  { method: 'POST', pattern: /^\/api\/predicted-sales\/import$/, action: 'predictions.import', label: 'Imported a sales forecast' },
  { method: 'DELETE', pattern: /^\/api\/predicted-sales\/import-logs\/[^/]+$/, action: 'predictions.import.delete', label: 'Deleted a forecast import' },
  { method: 'POST', pattern: /^\/api\/sync\/manual$/, action: 'sync.manual', label: 'Triggered a manual sync' },
  { method: 'POST', pattern: /^\/api\/settings\/users$/, action: 'settings.user.create', label: 'Created a user' },
  { method: 'PUT', pattern: /^\/api\/settings\/users\/[^/]+$/, action: 'settings.user.update', label: 'Updated a user' },
  { method: 'DELETE', pattern: /^\/api\/settings\/users\/[^/]+$/, action: 'settings.user.delete', label: 'Deleted a user' },
  { method: 'PUT', pattern: /^\/api\/settings\/roles\/[^/]+$/, action: 'settings.role.update', label: 'Updated a role' },
  { method: 'PUT', pattern: /^\/api\/settings\/notifications$/, action: 'settings.notifications.update', label: 'Updated notification settings' },
  { method: 'PUT', pattern: /^\/api\/settings\/api-config\/[^/]+$/, action: 'settings.api-config.update', label: 'Updated Petpooja API settings' },
  { method: 'PUT', pattern: /^\/api\/settings\/sync-schedule\/[^/]+$/, action: 'settings.sync-schedule.update', label: 'Updated the sync schedule' },
];

function describe(method: string, path: string): { action: string; label: string } {
  const rule = ACTION_RULES.find((r) => r.method === method && r.pattern.test(path));
  if (rule) return { action: rule.action, label: rule.label };
  // Ids are stripped from the key so "DELETE /api/foo/<id>" groups as one action in the filter.
  const key = path.replace(/^\/api\//, '').replace(/\/[^/]{16,}(?=\/|$)/g, '/:id').replace(/\//g, '.');
  return { action: `${method.toLowerCase()}.${key}`, label: `${method} ${path}` };
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * The calendar day an action applies to, taken from whichever field carries it. Day-scoped
 * endpoints all name it something slightly different, and lifting it here means a log row shows
 * "for 18 Sep" without every handler having to report it.
 */
function dayFrom(...sources: Record<string, unknown>[]): Date | null {
  for (const source of sources) {
    for (const key of ['stockDate', 'date', 'wastageDate']) {
      const value = str(source?.[key]);
      const match = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (match) return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
    }
  }
  return null;
}

/**
 * Records every successful mutating API call. Mounted once in front of the whole API rather
 * than per route, so coverage doesn't depend on each new endpoint remembering to opt in.
 *
 * A handler that knows more than the request body does — before/after values, which item —
 * adds it to `res.locals.activity` (see `setActivityDetail`), which is merged in here.
 */
export function activityLogger(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const body = req.body;
  const query = req.query;

  res.on('finish', () => {
    // Failed attempts aren't the audit trail's job — they changed nothing.
    if (res.statusCode >= 400) return;

    const path = req.originalUrl.split('?')[0];
    const { action, label } = describe(req.method, path);
    const detail = (res.locals.activity ?? {}) as ActivityDetail;
    const payloadSource = req.method === 'DELETE' ? { ...query, ...(body ?? {}) } : (body ?? query);

    void recordActivity({
      userId: req.user?.id ?? null,
      // An unauthenticated call that still succeeded (a webhook) has no user to name.
      userEmail: req.user?.email ?? str((body as Record<string, unknown>)?.email) ?? 'system',
      userRole: req.user?.role ?? null,
      action: detail.action ?? action,
      label: detail.label ?? label,
      method: req.method,
      path,
      outletId: detail.outletId ?? str((body as Record<string, unknown>)?.outletId) ?? str(query.outletId),
      brand: detail.brand ?? str((body as Record<string, unknown>)?.brand) ?? str(query.brand),
      // Class A adds name the item in `value` rather than `itemName`.
      itemName:
        detail.itemName ??
        str((body as Record<string, unknown>)?.itemName) ??
        str((body as Record<string, unknown>)?.value),
      stockDate:
        detail.stockDate ?? dayFrom((body ?? {}) as Record<string, unknown>, query as Record<string, unknown>),
      changes: detail.changes ?? null,
      payload: payloadSource,
      statusCode: res.statusCode,
    });
  });

  next();
}

/** Lets a handler attach what only it knows (before/after values, the affected item). */
export function setActivityDetail(res: Response, detail: ActivityDetail) {
  res.locals.activity = { ...(res.locals.activity ?? {}), ...detail };
}
