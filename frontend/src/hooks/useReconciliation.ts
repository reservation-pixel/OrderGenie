import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, PaginationMeta, ReconciliationRow } from '@/types/api';

export function useReconciliation(page: number, pageSize: number, outletId: string, brand: string, date: string) {
  return useQuery({
    queryKey: ['reconciliation', outletId, brand, date, page, pageSize],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<ReconciliationRow[]>>('/reconciliation', {
        params: { outletId, brand, date, page, pageSize },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
    enabled: Boolean(outletId) && outletId !== 'all',
  });
}

export interface UpsertReconciliationEntryInput {
  outletId: string;
  itemName: string;
  unit?: string;
  date: string;
  opening?: number;
  actualClosing?: number;
}

export function useUpsertReconciliationEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertReconciliationEntryInput) => apiClient.post('/reconciliation/entries', input),
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['reconciliation'] });
    },
    onError: () => toast.error('Failed to save'),
  });
}
