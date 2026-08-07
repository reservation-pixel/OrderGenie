'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/shared/Pagination';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { PurchaseOrderDetailDialog } from '@/components/purchase-orders/PurchaseOrderDetailDialog';
import { STATUS_VARIANT } from '@/components/purchase-orders/status';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useResettingPage } from '@/hooks/useResettingPage';
import { useFilterStore } from '@/store/filterStore';
import { formatCurrency, formatDate } from '@/lib/format';

const STATUSES = ['all', 'DRAFT', 'PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];

export default function PurchaseOrdersPage() {
  const { customFrom, customTo } = useFilterStore();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useResettingPage(`${status}|${customFrom}|${customTo}`);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = usePurchaseOrders(page, 25, status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Purchase Orders</h1>
        <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DateRangeFilter />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">Failed to load purchase orders.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Expected Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((po) => (
                      <TableRow key={po.id} className="cursor-pointer" onClick={() => setSelectedId(po.id)}>
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.vendorName}</TableCell>
                        <TableCell>{po.outletName}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[po.status]}>{po.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(po.totalAmount)}</TableCell>
                        <TableCell>{po.expectedDate ? formatDate(po.expectedDate) : '—'}</TableCell>
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

      <PurchaseOrderDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
