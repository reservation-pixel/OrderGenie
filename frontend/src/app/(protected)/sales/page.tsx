'use client';

import { useState } from 'react';
import { OutletCards } from '@/components/shared/OutletCards';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { SalesTransactionsTable } from '@/components/sales/SalesTransactionsTable';
import { useSales } from '@/hooks/useSales';
import { useFilterStore } from '@/store/filterStore';

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const { outletId, customFrom, customTo } = useFilterStore();
  const filterKey = `${outletId}|${customFrom}|${customTo}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }
  const { data, isLoading, isError } = useSales(page);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sales</h1>

      <OutletCards eligibleField="salesSyncCode" />

      <DateRangeFilter />

      <SalesTransactionsTable
        rows={data?.rows}
        meta={data?.meta}
        isLoading={isLoading}
        isError={isError}
        onPageChange={setPage}
        csvFilename="sales.csv"
      />
    </div>
  );
}
