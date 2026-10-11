import { ClassAItemType } from '@prisma/client';
import { prisma } from '../../config/db';
import { CRON_TIMEZONE } from '../../config/constants';
import { dateOnlyUtc } from '../../utils/dateRange';
import { getIngredientItemNames } from '../reconciliation/reconciliation.service';

/** Days looked back over. Three keeps a gap nobody acted on visible instead of scrolling away. */
const LOOKBACK_DAYS = 3;
/** A day is only chased once the kitchen has had the night and early morning to finish it. */
const REMINDER_HOUR_IST = 8;
/** Several tabs polling shouldn't each re-run the sweep. */
const CACHE_TTL_MS = 60_000;

export interface MissingClosingRow {
  outletId: string;
  outletName: string;
  brand: string;
  /** YYYY-MM-DD. */
  date: string;
  expected: number;
  filled: number;
  missing: number;
}

/** Calendar parts in IST, matching how the cron module reads the clock (CRON_TIMEZONE). */
function istParts(date: Date): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CRON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour') };
}

/**
 * The days worth chasing, newest first.
 *
 * Yesterday only joins the list once it is past 08:00 IST, so an outlet still counting at 6 AM
 * isn't reported as late. Earlier days are always eligible — their 8 AM has long passed.
 */
export function reminderDays(now: Date): Date[] {
  const { year, month, day, hour } = istParts(now);
  const today = dateOnlyUtc(year, month - 1, day);

  const days: Date[] = [];
  for (let back = 1; back <= LOOKBACK_DAYS; back++) {
    if (back === 1 && hour < REMINDER_HOUR_IST) continue;
    days.push(dateOnlyUtc(year, month - 1, day - back));
  }
  return days.filter((d) => d < today);
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Keyed by scope so one outlet's answer can never be served as the all-outlets answer.
const cache = new Map<string, { at: number; rows: MissingClosingRow[] }>();

/**
 * Outlets that haven't finished entering Actual Closing, one row per outlet-day.
 *
 * An outlet is behind when *any* tracked item has no closing — the row carries filled/expected so
 * a half-finished count reads differently from an untouched one. Nothing is stored: the answer is
 * recomputed, so it corrects itself the moment the figures go in.
 *
 * `outletIds` narrows the sweep to one outlet's own staff; omitted, it covers every outlet.
 */
export async function getMissingClosings(now: Date = new Date(), outletIds?: string[]): Promise<MissingClosingRow[]> {
  // An explicit empty list means "this user has no outlet", which is not the same as "all outlets".
  if (outletIds && outletIds.length === 0) return [];

  const cacheKey = outletIds ? [...outletIds].sort().join(',') : 'all';
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.rows;

  const days = reminderDays(now);
  if (days.length === 0) return [];

  // Only brands that curate Class A Items reconcile at all; the KG stores have nothing to enter,
  // so they can never be "missing" anything.
  const classAEntries = await prisma.classAItem.findMany({
    where: { type: ClassAItemType.ITEM },
    select: { brand: true },
    distinct: ['brand'],
  });
  const brands = classAEntries.map((e) => e.brand);
  if (brands.length === 0) return [];

  const outlets = await prisma.outlet.findMany({
    where: { isActive: true, brand: { in: brands }, ...(outletIds ? { id: { in: outletIds } } : {}) },
    select: { id: true, name: true, brand: true },
    orderBy: { name: 'asc' },
  });
  if (outlets.length === 0) return [];

  // One query for every outlet and day; a closing of 0 counts as not entered, the same way the
  // reconciliation page treats a missing row.
  const entries = await prisma.inventory.findMany({
    where: {
      outletId: { in: outlets.map((o) => o.id) },
      stockDate: { in: days },
      closingStock: { gt: 0 },
    },
    select: { outletId: true, itemName: true, stockDate: true },
  });

  const filledByOutletDay = new Map<string, Set<string>>();
  for (const entry of entries) {
    const key = `${entry.outletId}|${dayKey(entry.stockDate)}`;
    if (!filledByOutletDay.has(key)) filledByOutletDay.set(key, new Set());
    filledByOutletDay.get(key)!.add(entry.itemName);
  }

  const rows: MissingClosingRow[] = [];
  for (const outlet of outlets) {
    for (const day of days) {
      const expectedNames = await getIngredientItemNames(outlet.id, outlet.brand, day);
      if (expectedNames.length === 0) continue;

      const filledNames = filledByOutletDay.get(`${outlet.id}|${dayKey(day)}`) ?? new Set<string>();
      const filled = expectedNames.filter((name) => filledNames.has(name)).length;
      if (filled >= expectedNames.length) continue;

      rows.push({
        outletId: outlet.id,
        outletName: outlet.name,
        brand: outlet.brand,
        date: dayKey(day),
        expected: expectedNames.length,
        filled,
        missing: expectedNames.length - filled,
      });
    }
  }

  // Newest day first, then by outlet, so this morning's misses lead.
  rows.sort((a, b) => b.date.localeCompare(a.date) || a.outletName.localeCompare(b.outletName));

  cache.set(cacheKey, { at: Date.now(), rows });
  return rows;
}

/** Lets a save clear the alert immediately rather than up to a minute later. */
export function clearMissingClosingsCache(): void {
  cache.clear();
}
