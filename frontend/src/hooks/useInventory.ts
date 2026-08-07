import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRangeParams, type RangeParamOverrides } from '@/hooks/useRangeParams';
import type { ApiEnvelope, InventoryDetail, InventoryRow, PaginationMeta } from '@/types/api';

export function useInventory(
  page: number,
  pageSize = 25,
  extra: { store?: string; category?: string; lowStockOnly?: boolean } = {},
  overrides?: RangeParamOverrides
) {
  const rangeParams = useRangeParams(overrides);

  return useQuery({
    queryKey: ['inventory', rangeParams, page, pageSize, extra],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<InventoryRow[]>>('/inventory', {
        params: { ...rangeParams, page, pageSize, ...extra },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
  });
}

export function useInventoryDetail(id: string | null) {
  return useQuery({
    queryKey: ['inventory-detail', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<InventoryDetail>>(`/inventory/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useInventoryStores() {
  return useQuery({
    queryKey: ['inventory-stores'],
    queryFn: async () => (await apiClient.get<ApiEnvelope<string[]>>('/inventory/stores')).data.data,
  });
}

export function useInventoryCategories() {
  return useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => (await apiClient.get<ApiEnvelope<string[]>>('/inventory/categories')).data.data,
  });
}
