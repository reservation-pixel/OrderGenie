import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRangeParams, type RangeParamOverrides } from '@/hooks/useRangeParams';
import type { ApiEnvelope, PaginationMeta, PurchaseOrderDetail, PurchaseOrderRow } from '@/types/api';

export interface UsePurchaseOrdersOptions {
  status?: string;
  overrides?: RangeParamOverrides;
  dateField?: 'orderDate' | 'petpoojaCreatedAt';
  search?: string;
}

export function usePurchaseOrders(page: number, pageSize = 25, options?: UsePurchaseOrdersOptions) {
  const { status, overrides, dateField, search } = options ?? {};
  const rangeParams = useRangeParams(overrides);

  return useQuery({
    queryKey: ['purchase-orders', rangeParams, page, pageSize, status, dateField, search],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<PurchaseOrderRow[]>>('/purchase-orders', {
        params: {
          ...rangeParams,
          page,
          pageSize,
          ...(status && status !== 'all' ? { status } : {}),
          ...(dateField ? { dateField } : {}),
          ...(search ? { search } : {}),
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
