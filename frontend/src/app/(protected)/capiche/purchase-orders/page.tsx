'use client';

import { BrandPurchaseOrdersTab } from '@/components/brand-workspace/BrandPurchaseOrdersTab';
import { useBrandFilter } from '@/lib/brand-filter-context';

export default function CapichePurchaseOrdersPage() {
  const { outletId } = useBrandFilter();
  return <BrandPurchaseOrdersTab brand="Capiche" outletId={outletId} />;
}
