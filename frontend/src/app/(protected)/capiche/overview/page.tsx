'use client';

import { BrandOverviewTab } from '@/components/brand-workspace/BrandOverviewTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function CapicheOverviewPage() {
  const { outletId } = useBrandFilter();
  return <BrandOverviewTab brand="Capiche" outletId={outletId} />;
}
