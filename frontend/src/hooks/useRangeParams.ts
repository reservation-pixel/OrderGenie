import { useFilterStore } from '@/store/filterStore';

export interface RangeParamOverrides {
  /** Bypasses the global filter store's outletId — pass 'all' or a specific outlet id. */
  outletId?: string;
  /** Scopes to every outlet under this brand; ignored when outletId is a specific id. */
  brand?: string;
}

export function useRangeParams(overrides?: RangeParamOverrides) {
  const { outletId, range, customFrom, customTo } = useFilterStore();
  const params: Record<string, string> = { range };
  const effectiveOutletId = overrides?.outletId ?? outletId;
  if (effectiveOutletId !== 'all') {
    params.outletId = effectiveOutletId;
  } else if (overrides?.brand) {
    params.brand = overrides.brand;
  }
  if (range === 'custom' && customFrom && customTo) {
    params.from = customFrom;
    params.to = customTo;
  }
  return params;
}
