'use client';

import { BrandInventoryTab } from '@/components/brand-workspace/BrandInventoryTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function AikoInventoryPage() {
  const { outletId } = useBrandFilter();
  return <BrandInventoryTab brand="Aiko" outletId={outletId} />;
}
