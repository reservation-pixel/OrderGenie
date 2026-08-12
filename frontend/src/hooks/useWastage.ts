import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useRangeParams, type RangeParamOverrides } from '@/hooks/useRangeParams';
import type { ApiEnvelope, PaginationMeta, WastageEntry, WastageReason } from '@/types/api';

export function useWastageEntries(page: number, pageSize = 10, overrides?: RangeParamOverrides) {
  const rangeParams = useRangeParams(overrides);

  return useQuery({
    queryKey: ['wastage', rangeParams, page, pageSize],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<WastageEntry[]>>('/wastage', {
        params: { ...rangeParams, page, pageSize },
      });
      return { rows: res.data.data, meta: res.data.meta as PaginationMeta };
    },
  });
}

export interface CreateWastageInput {
  outletId: string;
  itemName: string;
  category?: string;
  quantity: number;
  unit?: string;
  reason: WastageReason;
  notes?: string;
}

export function useCreateWastageEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWastageInput) => apiClient.post('/wastage', input),
    onSuccess: () => {
      toast.success('Wastage entry added');
      qc.invalidateQueries({ queryKey: ['wastage'] });
    },
    onError: () => toast.error('Failed to add wastage entry'),
  });
}

export function useDeleteWastageEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/wastage/${id}`),
    onSuccess: () => {
      toast.success('Wastage entry removed');
      qc.invalidateQueries({ queryKey: ['wastage'] });
    },
    onError: () => toast.error('Failed to remove wastage entry'),
  });
}
