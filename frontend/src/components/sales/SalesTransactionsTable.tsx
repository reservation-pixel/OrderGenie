'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { useSaleDetail } from '@/hooks/useSales';
import { formatCurrency, formatDate, formatNumber, formatTime } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import type { PaginationMeta, SaleRow } from '@/types/api';

const COLUMN_COUNT = 11;

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

export function SalesTransactionsTable({
  rows,
  meta,
  isLoading,
  isError,
  onPageChange,
  csvFilename,
}: {
  rows?: SaleRow[];
  meta?: PaginationMeta;
  isLoading: boolean;
  isError: boolean;
  onPageChange: (page: number) => void;
  csvFilename: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Transactions</CardTitle>
        <Button variant="outline" size="sm" onClick={() => rows && downloadCsv(csvFilename, rows.map(toCsvRow))}>
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError || !rows ? (
          <p className="text-sm text-destructive">Failed to load sales.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
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
                  {rows.map((s) => {
                    const isExpanded = expanded.has(s.id);
                    return (
                      <Fragment key={s.id}>
                        <TableRow className="cursor-pointer" onClick={() => toggleRow(s.id)}>
                          <TableCell>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
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
                        {isExpanded && <SaleItemsRow saleId={s.id} net={s.net} />}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination meta={meta} onPageChange={onPageChange} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SaleItemsRow({ saleId, net }: { saleId: string; net: number }) {
  const { data, isLoading, isError } = useSaleDetail(saleId);

  return (
    <TableRow>
      <TableCell colSpan={COLUMN_COUNT} className="bg-muted/30">
        {isLoading ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError || !data ? (
          <p className="py-1 text-sm text-destructive">Failed to load item details.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>{item.category ?? '—'}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="px-2 py-2 text-right text-sm text-muted-foreground">
              {data.items.length} item{data.items.length === 1 ? '' : 's'} &middot; total {formatCurrency(net)}
            </p>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
