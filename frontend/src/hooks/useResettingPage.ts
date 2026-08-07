import { useState } from 'react';

/** Resets `page` to 1 whenever the outlet/date filter changes — React's
 * "adjust state during render" pattern, since setState in an effect is disallowed. */
export function useResettingPage(filterKey: string) {
  const [page, setPage] = useState(1);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }
  return [page, setPage] as const;
}
