'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { OutletCards } from '@/components/shared/OutletCards';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { useSales } from '@/hooks/useSales';
import { useFilterStore } from '@/store/filterStore';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import type { SaleRow } from '@/types/api';

function toCsvRow(s: SaleRow) {
  return {
    invoiceNumber: s.invoiceNumber,
    outletName: s.outletName,
    date: s.date,
    time: s.time,
    customer: s.customer,
    gross: s.gross,
    discount: s.discount,
    tax: s.tax,
    net: s.net,
    paymentMode: s.paymentMode,
  };
}

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Sales</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              data && downloadCsv('sales.csv', data.rows.map(toCsvRow))
            }
          >
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <OutletCards eligibleField="salesSyncCode" />

      <DateRangeFilter />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">Failed to load sales.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.invoiceNumber}</TableCell>
                        <TableCell>{s.outletName}</TableCell>
                        <TableCell>{formatDate(s.date)}</TableCell>
                        <TableCell>{formatTime(s.time)}</TableCell>
                        <TableCell>{s.customer ?? '—'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.gross)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.discount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.tax)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(s.net)}</TableCell>
                        <TableCell>{s.paymentMode}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination meta={data.meta} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
