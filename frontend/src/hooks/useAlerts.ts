import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import type { ApiEnvelope, MissingClosingRow } from '@/types/api';

/**
 * Outlets that haven't finished entering Actual Closing over the last few days.
 *
 * Super admin only — the endpoint 403s for everyone else, so the query is disabled rather than
 * firing a request that can only fail. Polled rather than pushed: the answer is recomputed server
 * side, so a refetch is all it takes for a filled-in gap to disappear.
 */
export function useMissingClosings() {
  const role = useAuthStore((s) => s.user)?.role;

  return useQuery({
    queryKey: ['alerts', 'missing-closings'],
    queryFn: async () =>
      (await apiClient.get<ApiEnvelope<MissingClosingRow[]>>('/alerts/missing-closings')).data.data,
    enabled: role === 'SUPER_ADMIN',
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}
