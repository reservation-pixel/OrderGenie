'use client';

import { BrandClassAItemsTab } from '@/components/brand-workspace/BrandClassAItemsTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function CapicheClassAItemsPage() {
  const { outletId } = useBrandFilter();
  return <BrandClassAItemsTab brand="Capiche" outletId={outletId} />;
}
