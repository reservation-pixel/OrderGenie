import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRangeParams, type RangeParamOverrides } from '@/hooks/useRangeParams';
import type { ApiEnvelope, DashboardData } from '@/types/api';

export function useDashboard(overrides?: RangeParamOverrides) {
  const rangeParams = useRangeParams(overrides);

  return useQuery({
    queryKey: ['dashboard', rangeParams],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<DashboardData>>('/dashboard', {
        params: rangeParams,
      });
      return res.data.data;
    },
  });
}
