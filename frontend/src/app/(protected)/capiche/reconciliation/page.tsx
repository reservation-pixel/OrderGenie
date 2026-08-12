'use client';

import { BrandReconciliationTab } from '@/components/brand-workspace/BrandReconciliationTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function CapicheReconciliationPage() {
  const { outletId } = useBrandFilter();
  return <BrandReconciliationTab brand="Capiche" outletId={outletId} />;
}
