'use client';

import { BrandPredictionsTab } from '@/components/brand-workspace/BrandPredictionsTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function AikoPredictionsPage() {
  const { outletId } = useBrandFilter();
  return <BrandPredictionsTab brand="Aiko" outletId={outletId} />;
}
