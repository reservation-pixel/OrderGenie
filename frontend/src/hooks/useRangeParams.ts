import { useFilterStore } from '@/store/filterStore';

export function useRangeParams() {
  const { outletId, range, customFrom, customTo } = useFilterStore();
  const params: Record<string, string> = { range };
  if (outletId !== 'all') params.outletId = outletId;
  if (range === 'custom' && customFrom && customTo) {
    params.from = customFrom;
    params.to = customTo;
  }
  return params;
}
