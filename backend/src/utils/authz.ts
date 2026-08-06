import type { Request } from 'express';
import { RoleName } from '@prisma/client';

/**
 * Returns the outletId a detail-by-id lookup must be restricted to, or undefined
 * if the caller isn't outlet-scoped. Used alongside scopeToOutlet (which only
 * rewrites list-query params) to also guard single-record :id lookups, which
 * bypass query filtering entirely.
 */
export function outletRestrictionFor(req: Request): string | undefined {
  if (req.user?.role === RoleName.OUTLET_MANAGER) {
    return req.user.outletId ?? undefined;
  }
  return undefined;
}
