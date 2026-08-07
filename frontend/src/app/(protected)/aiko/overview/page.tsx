'use client';

import { BrandOverviewTab } from '@/components/brand-workspace/BrandOverviewTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function AikoOverviewPage() {
  const { outletId } = useBrandFilter();
  return <BrandOverviewTab brand="Aiko" outletId={outletId} />;
}
