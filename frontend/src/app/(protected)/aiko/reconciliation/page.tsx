'use client';

import { BrandReconciliationTab } from '@/components/brand-workspace/BrandReconciliationTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function AikoReconciliationPage() {
  const { outletId } = useBrandFilter();
  return <BrandReconciliationTab brand="Aiko" outletId={outletId} />;
}
