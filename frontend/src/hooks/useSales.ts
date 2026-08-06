import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRangeParams } from '@/hooks/useRangeParams';
import type { ApiEnvelope, ItemSalesRow, PaginationMeta, SaleDetail, SaleRow } from '@/types/api';

export function useSales(page: number, pageSize = 25) {
  const rangeParams = useRangeParams();

  return useQuery({
    queryKey: ['sales', rangeParams, page, pageSize],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<SaleRow[]>>('/sales', {
        params: { ...rangeParams, page, pageSize },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
  });
}

export function useSaleDetail(id: string | null) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<SaleDetail>>(`/sales/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useItemSales(page: number, pageSize = 25, extra: { search?: string; category?: string; sort?: 'top' | 'least' } = {}) {
  const rangeParams = useRangeParams();

  return useQuery({
    queryKey: ['item-sales', rangeParams, page, pageSize, extra],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<ItemSalesRow[]>>('/sales/items', {
        params: { ...rangeParams, page, pageSize, ...extra },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
  });
}
