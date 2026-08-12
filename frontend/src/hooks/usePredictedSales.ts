import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, PaginationMeta, PredictedSaleRow } from '@/types/api';

export function usePredictedSales(page: number, pageSize: number, outletId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['predicted-sales', outletId, from, to, page, pageSize],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<PredictedSaleRow[]>>('/predicted-sales', {
        params: { outletId, from, to, page, pageSize },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
    enabled: Boolean(outletId) && outletId !== 'all' && Boolean(from) && Boolean(to),
  });
}
