import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useFilterStore } from '@/store/filterStore';
import type { ApiEnvelope } from '@/types/api';

export interface ItemDetail {
  itemName: string;
  dailyTrend: { date: string; amount: number }[];
  weeklyTrend: { date: string; amount: number }[];
  monthlyTrend: { date: string; amount: number }[];
  outletComparison: { outletId: string; outletName: string; revenue: number; quantity: number }[];
  peakHours: { hour: number; quantity: number }[];
}

export function useItemDetail(itemName: string | null) {
  const outletId = useFilterStore((s) => s.outletId);

  return useQuery({
    queryKey: ['item-detail', itemName, outletId],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<ItemDetail>>(`/sales/items/${encodeURIComponent(itemName!)}`, {
        params: outletId !== 'all' ? { outletId } : {},
      });
      return res.data.data;
    },
    enabled: Boolean(itemName),
  });
}
