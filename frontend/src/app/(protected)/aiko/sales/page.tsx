'use client';

import { BrandSalesTab } from '@/components/brand-workspace/BrandSalesTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function AikoSalesPage() {
  const { outletId } = useBrandFilter();
  return <BrandSalesTab brand="Aiko" outletId={outletId} />;
}
