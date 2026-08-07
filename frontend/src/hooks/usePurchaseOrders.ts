import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRangeParams, type RangeParamOverrides } from '@/hooks/useRangeParams';
import type { ApiEnvelope, PaginationMeta, PurchaseOrderDetail, PurchaseOrderRow } from '@/types/api';

export function usePurchaseOrders(page: number, pageSize = 25, status?: string, overrides?: RangeParamOverrides) {
  const rangeParams = useRangeParams(overrides);

  return useQuery({
    queryKey: ['purchase-orders', rangeParams, page, pageSize, status],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<PurchaseOrderRow[]>>('/purchase-orders', {
        params: {
          ...rangeParams,
          page,
          pageSize,
          ...(status && status !== 'all' ? { status } : {}),
        },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
  });
}

export function usePurchaseOrderDetail(id: string | null) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<PurchaseOrderDetail>>(`/purchase-orders/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}
