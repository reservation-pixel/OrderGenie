'use client';

import { BrandSoldOutTab } from '@/components/brand-workspace/BrandSoldOutTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function CapicheSoldOutPage() {
  const { outletId } = useBrandFilter();
  return <BrandSoldOutTab brand="Capiche" outletId={outletId} />;
}
