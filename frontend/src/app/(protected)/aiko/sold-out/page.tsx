'use client';

import { BrandSoldOutTab } from '@/components/brand-workspace/BrandSoldOutTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function AikoSoldOutPage() {
  const { outletId } = useBrandFilter();
  return <BrandSoldOutTab brand="Aiko" outletId={outletId} />;
}
