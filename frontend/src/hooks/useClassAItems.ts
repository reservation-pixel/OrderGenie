import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useRangeParams } from '@/hooks/useRangeParams';
import type { ApiEnvelope, ClassAItem, ClassAItemSummaryRow, ClassAItemType } from '@/types/api';

export function useClassAItems(brand: string) {
  return useQuery({
    queryKey: ['class-a-items', brand],
    queryFn: async () => (await apiClient.get<ApiEnvelope<ClassAItem[]>>('/class-a-items', { params: { brand } })).data.data,
  });
}

export function useClassAItemsSummary({ brand, outletId }: { brand: string; outletId: string }) {
  const rangeParams = useRangeParams({ outletId, brand });
  // useRangeParams omits `brand` once a specific outletId is chosen (it's only a fallback
  // there), but the summary endpoint always needs `brand` to know which curated list to load.
  const params = { ...rangeParams, brand };

  return useQuery({
    queryKey: ['class-a-items-summary', params],
    queryFn: async () =>
      (await apiClient.get<ApiEnvelope<ClassAItemSummaryRow[]>>('/class-a-items/summary', { params })).data.data,
  });
}

export function useAddClassAItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { brand: string; type: ClassAItemType; value: string }) => apiClient.post('/class-a-items', input),
    onSuccess: (_data, input) => {
      toast.success(`Added ${input.value} to Class A items`);
      qc.invalidateQueries({ queryKey: ['class-a-items', input.brand] });
      qc.invalidateQueries({ queryKey: ['class-a-items-summary'] });
    },
    onError: () => toast.error('Failed to add item'),
  });
}

export function useRemoveClassAItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; brand: string }) => apiClient.delete(`/class-a-items/${id}`),
    onSuccess: (_data, input) => {
      toast.success('Removed from Class A items');
      qc.invalidateQueries({ queryKey: ['class-a-items', input.brand] });
      qc.invalidateQueries({ queryKey: ['class-a-items-summary'] });
    },
    onError: () => toast.error('Failed to remove item'),
  });
}
