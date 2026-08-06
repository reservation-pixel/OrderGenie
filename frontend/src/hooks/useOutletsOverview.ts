import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useFilterStore } from '@/store/filterStore';
import type { ApiEnvelope, OutletComparisonRow, OutletOverviewRow } from '@/types/api';

export function useOutletsOverview() {
  return useQuery({
    queryKey: ['outlets-overview'],
    queryFn: async () => (await apiClient.get<ApiEnvelope<OutletOverviewRow[]>>('/outlets/overview')).data.data,
  });
}

// Deliberately outlet-agnostic — this view compares ACROSS outlets, so only the
// date range (including custom from/to) applies, never the single-outlet filter.
export function useOutletComparison() {
  const { range, customFrom, customTo } = useFilterStore();
  const params: Record<string, string> = { range };
  if (range === 'custom' && customFrom && customTo) {
    params.from = customFrom;
    params.to = customTo;
  }

  return useQuery({
    queryKey: ['outlets-comparison', params],
    queryFn: async () =>
      (await apiClient.get<ApiEnvelope<OutletComparisonRow[]>>('/outlets/comparison', { params })).data.data,
  });
}
