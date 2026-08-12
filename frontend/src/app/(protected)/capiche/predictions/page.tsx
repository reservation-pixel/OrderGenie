'use client';

import { BrandPredictionsTab } from '@/components/brand-workspace/BrandPredictionsTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function CapichePredictionsPage() {
  const { outletId } = useBrandFilter();
  return <BrandPredictionsTab brand="Capiche" outletId={outletId} />;
}
