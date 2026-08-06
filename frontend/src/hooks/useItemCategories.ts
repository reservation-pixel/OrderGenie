import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/api';

export function useItemCategories() {
  return useQuery({
    queryKey: ['item-categories'],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<string[]>>('/sales/items/categories');
      return res.data.data;
    },
  });
}
