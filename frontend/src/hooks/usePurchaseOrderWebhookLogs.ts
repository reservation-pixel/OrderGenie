import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRangeParams, type RangeParamOverrides } from '@/hooks/useRangeParams';
import type { ApiEnvelope, PaginationMeta, PurchaseOrderWebhookLogDetail, PurchaseOrderWebhookLogRow } from '@/types/api';

export interface UsePurchaseOrderWebhookLogsOptions {
  outcome?: string;
  status?: string;
  overrides?: RangeParamOverrides;
  search?: string;
}

export function usePurchaseOrderWebhookLogs(page: number, pageSize = 25, options?: UsePurchaseOrderWebhookLogsOptions) {
  const { outcome, status, overrides, search } = options ?? {};
  const rangeParams = useRangeParams(overrides);

  return useQuery({
    queryKey: ['purchase-order-webhook-logs', rangeParams, page, pageSize, outcome, status, search],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<PurchaseOrderWebhookLogRow[]>>('/purchase-order-webhook-logs', {
        params: {
          ...rangeParams,
          page,
          pageSize,
          ...(outcome && outcome !== 'all' ? { outcome } : {}),
          ...(status && status !== 'all' ? { status } : {}),
          ...(search ? { search } : {}),
        },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
  });
}

export function usePurchaseOrderWebhookLogDetail(id: string | null) {
  return useQuery({
    queryKey: ['purchase-order-webhook-log', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<PurchaseOrderWebhookLogDetail>>(`/purchase-order-webhook-logs/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}
