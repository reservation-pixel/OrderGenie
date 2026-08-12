'use client';

import { BrandWastageTab } from '@/components/brand-workspace/BrandWastageTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function AikoWastageManagementPage() {
  const { outletId } = useBrandFilter();
  return <BrandWastageTab brand="Aiko" outletId={outletId} />;
}
