'use client';

import { SalesTransactionsTable } from '@/components/sales/SalesTransactionsTable';
import { useSales } from '@/hooks/useSales';
import { useResettingPage } from '@/hooks/useResettingPage';
import { useFilterStore } from '@/store/filterStore';

export function BrandSalesTab({ brand, outletId }: { brand: string; outletId: string }) {
  const { customFrom, customTo } = useFilterStore();
  const filterKey = `${outletId}|${customFrom}|${customTo}`;
  const [page, setPage] = useResettingPage(filterKey);
  const { data, isLoading, isError } = useSales(page, 10, { outletId, brand });

  return (
    <SalesTransactionsTable
      rows={data?.rows}
      meta={data?.meta}
      isLoading={isLoading}
      isError={isError}
      onPageChange={setPage}
      csvFilename={`${brand.toLowerCase()}-sales.csv`}
    />
  );
}
