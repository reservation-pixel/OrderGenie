import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, Outlet } from '@/types/api';

export function useOutlets() {
  return useQuery({
    queryKey: ['outlets'],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<Outlet[]>>('/outlets');
      return res.data.data;
    },
  });
}
