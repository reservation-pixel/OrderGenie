import { useMemo, useState } from 'react';
import type { PaginationMeta } from '@/types/api';

/**
 * Client-side pagination for endpoints that return the full list in one response
 * (no page/pageSize support on the backend) — Outlets overview/comparison, Users,
 * Sync Logs, and the API Explorer's live-fetch results all fall into this bucket.
 * Deliberately does NOT auto-reset `page` when `items` changes — useSyncLogs polls
 * every 15s, and resetting on every new array reference would yank the user back to
 * page 1 mid-browse. `page` only clamps down if the list has shrunk below it. Callers
 * that want an explicit reset on a genuinely new dataset (e.g. after a manual "Fetch"
 * in the API Explorer) should call the returned `setPage(1)` themselves.
 */
export function usePagedList<T>(items: T[] | undefined, pageSize = 12) {
  const [page, setPage] = useState(1);

  const allItems = items ?? [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => allItems.slice((safePage - 1) * pageSize, safePage * pageSize),
    [allItems, safePage, pageSize]
  );

  const meta: PaginationMeta = { page: safePage, pageSize, total: allItems.length, totalPages };

  return { pageItems, meta, setPage };
}
