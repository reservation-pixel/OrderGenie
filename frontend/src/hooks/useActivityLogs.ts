import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ActivityLogFilters, ActivityLogRow, ApiEnvelope, PaginationMeta } from '@/types/api';

export interface ActivityLogQueryOptions {
  from: string;
  to: string;
  action?: string;
  userId?: string;
  outletId?: string;
  search?: string;
}

export function useActivityLogs(page: number, pageSize: number, options: ActivityLogQueryOptions) {
  const { from, to, action, userId, outletId, search } = options;

  return useQuery({
    queryKey: ['activity-logs', page, pageSize, from, to, action, userId, outletId, search],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<ActivityLogRow[]>>('/activity-logs', {
        params: {
          page,
          pageSize,
          from,
          to,
          ...(action && action !== 'all' ? { action } : {}),
          ...(userId && userId !== 'all' ? { userId } : {}),
          ...(outletId && outletId !== 'all' ? { outletId } : {}),
          ...(search ? { search } : {}),
        },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
  });
}

/** The users and actions that actually appear in the log, for the filter dropdowns. */
export function useActivityLogFilters() {
  return useQuery({
    queryKey: ['activity-log-filters'],
    queryFn: async () => (await apiClient.get<ApiEnvelope<ActivityLogFilters>>('/activity-logs/filters')).data.data,
  });
}
