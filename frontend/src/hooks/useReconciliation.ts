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
  /** Skips the success toast — used for debounced auto-saves so typing doesn't spam toasts. */
  silent?: boolean;
}

export function useUpsertReconciliationEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ outletId, itemName, unit, date, opening, actualClosing }: UpsertReconciliationEntryInput) =>
      apiClient.post('/reconciliation/entries', { outletId, itemName, unit, date, opening, actualClosing }),
    onSuccess: (_data, variables) => {
      if (!variables.silent) toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['reconciliation'] });
    },
    onError: () => toast.error('Failed to save'),
  });
}

export function useClearAllOpenings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ outletId, brand, date }: { outletId: string; brand: string; date: string }) =>
      (await apiClient.delete<ApiEnvelope<{ cleared: number }>>('/reconciliation/entries/openings', { params: { outletId, brand, date } }))
        .data.data,
    onSuccess: (result) => {
      toast.success(`Cleared Opening for ${result.cleared} item${result.cleared === 1 ? '' : 's'}`);
      qc.invalidateQueries({ queryKey: ['reconciliation'] });
    },
    onError: () => toast.error('Failed to clear openings'),
  });
}

export function useClearAllClosings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ outletId, brand, date }: { outletId: string; brand: string; date: string }) =>
      (await apiClient.delete<ApiEnvelope<{ cleared: number }>>('/reconciliation/entries/closings', { params: { outletId, brand, date } }))
        .data.data,
    onSuccess: (result) => {
      toast.success(`Cleared Actual Closing for ${result.cleared} item${result.cleared === 1 ? '' : 's'}`);
      qc.invalidateQueries({ queryKey: ['reconciliation'] });
    },
    onError: () => toast.error('Failed to clear closings'),
  });
}

/**
 * Saves the super admin's arranged row order for a brand. Every outlet of the brand shares it,
 * so all reconciliation queries are invalidated rather than just the one on screen.
 */
export function useSaveReconciliationOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ brand, itemNames }: { brand: string; itemNames: string[] }) =>
      apiClient.put('/reconciliation/order', { brand, itemNames }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reconciliation'] }),
    onError: () => {
      toast.error('Could not save the new order');
      qc.invalidateQueries({ queryKey: ['reconciliation'] });
    },
  });
}
