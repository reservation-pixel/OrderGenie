'use client';

import { BrandSalesTab } from '@/components/brand-workspace/BrandSalesTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function CapicheSalesPage() {
  const { outletId } = useBrandFilter();
  return <BrandSalesTab brand="Capiche" outletId={outletId} />;
}
