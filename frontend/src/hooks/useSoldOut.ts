import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, PaginationMeta, SoldOutRow } from '@/types/api';

export function useSoldOut(page: number, pageSize: number, outletId: string, date: string) {
  return useQuery({
    queryKey: ['sold-out', outletId, date, page, pageSize],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<SoldOutRow[]>>('/sold-out', {
        params: { outletId, date, page, pageSize },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
    enabled: Boolean(outletId) && outletId !== 'all',
  });
}

export interface UpsertSoldOutEntryInput {
  outletId: string;
  itemName: string;
  date: string;
  missedQty: number;
}

export function useUpsertSoldOutEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertSoldOutEntryInput) => apiClient.post('/sold-out/entries', input),
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['sold-out'] });
    },
    onError: () => toast.error('Failed to save'),
  });
}
