export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Day boundaries computed in fixed-offset IST (UTC+5:30, no DST), not server-local
 * time. The server (Render) runs with no TZ set, i.e. UTC — plain `Date.setHours()`
 * would compute boundaries ~5.5h off from the intended Asia/Kolkata calendar day
 * (same timezone the app already commits to via CRON_TIMEZONE in constants.ts).
 * Only getTime()/setUTCHours() are used so this is deterministic regardless of the
 * host's local timezone.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

function endOfDay(d: Date): Date {
  return new Date(startOfDay(d).getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function resolveDateRange(query: {
  range?: string;
  from?: string;
  to?: string;
}): DateRange {
  const now = new Date();

  if (query.from && query.to) {
    return { from: startOfDay(new Date(query.from)), to: endOfDay(new Date(query.to)) };
  }

  switch (query.range) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'week': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'month':
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
  }
}

export function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatDateYYYYMMDD(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Builds a Date for a `@db.Date` (calendar-day-only) column from LOCAL Y/M/D
 * components, using Date.UTC so the stored calendar day is exactly the intended
 * one regardless of server timezone. Constructing a "calendar day" Date via local
 * midnight (e.g. `new Date(y, m, d)`) and letting it round-trip through Prisma
 * would represent local midnight as a UTC instant that falls on the PREVIOUS UTC
 * day whenever the server runs east of UTC (e.g. IST, UTC+5:30) — and Postgres
 * DATE columns get populated from that instant's UTC calendar day, not its local
 * one, silently shifting every stored date back by one day. Always use this
 * instead of `new Date(year, month, day)` when the result is written to a
 * `@db.Date` field (Sale.orderDate, Inventory.stockDate, etc).
 */
export function dateOnlyUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}
