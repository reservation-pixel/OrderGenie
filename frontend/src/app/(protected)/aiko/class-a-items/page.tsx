'use client';

import { BrandClassAItemsTab } from '@/components/brand-workspace/BrandClassAItemsTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function AikoClassAItemsPage() {
  const { outletId } = useBrandFilter();
  return <BrandClassAItemsTab brand="Aiko" outletId={outletId} />;
}
