'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/shared/Pagination';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { PurchaseOrderDetailDialog } from '@/components/purchase-orders/PurchaseOrderDetailDialog';
import { STATUS_VARIANT } from '@/components/purchase-orders/status';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useResettingPage } from '@/hooks/useResettingPage';
import { useOutlets } from '@/hooks/useOutlets';
import { useFilterStore } from '@/store/filterStore';
import { formatCurrency, formatDate } from '@/lib/format';

// PENDING/CANCELLED come from the inbound PO webhook (purchaseOrderWebhook.service.ts).
// RECEIVED comes from a different source — the separate get_purchase sync
// (purchaseSync.service.ts), which always writes RECEIVED and never PENDING/CANCELLED.
// Offered together here so admins can check both "ordered" and "received" state
// from one screen, even though they're populated by two different pipelines.
const STATUS_OPTIONS = ['PENDING', 'CANCELLED', 'RECEIVED'];

export function ReceivedPurchaseOrdersTab() {
  const { outletId, customFrom, customTo, setOutletId } = useFilterStore();
  const { data: outlets } = useOutlets();
  const [status, setStatus] = useState('PENDING');
  const [dateField, setDateField] = useState<'orderDate' | 'createdAt'>('orderDate');
  const [search, setSearch] = useState('');
  const [page, setPage] = useResettingPage(`${status}|${outletId}|${customFrom}|${customTo}|${dateField}|${search}`);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = usePurchaseOrders(page, 25, { status, dateField, search: search || undefined });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {status === 'RECEIVED' ? (
          <>
            <strong>Received</strong> purchase orders come from the Purchase API sync (get_purchase), synced every
            15 minutes — these are invoices for goods already delivered and added to stock.
          </>
        ) : (
          <>
            <strong>{status === 'PENDING' ? 'Pending' : 'Cancelled'}</strong> purchase orders come from the inbound
            Purchase Order webhook (API 8) — Petpooja pushes these to{' '}
            <code className="text-xs">/api/webhooks/petpooja/purchase-order</code> the moment a PO is saved on
            their end, before anything has actually been received.
          </>
        )}{' '}
        This is a read-only view of local data, not a live Petpooja call.
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <DateRangeFilter />
          <Select value={dateField} onValueChange={(v) => setDateField(v === 'createdAt' ? 'createdAt' : 'orderDate')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Date filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="orderDate">Order Date</SelectItem>
              <SelectItem value="createdAt">Created On</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <Input
            placeholder="Search PO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[180px]"
          />
          <Select value={outletId} onValueChange={(v) => setOutletId(v ?? 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Outlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {(outlets ?? []).map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v ?? 'PENDING')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Received Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">Failed to load purchase orders.</p>
          ) : data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {status.toLowerCase().replace('_', ' ')} purchase orders in this date range.
            </p>
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
                      <TableHead>Received</TableHead>
                      <TableHead>Created On</TableHead>
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
                        <TableCell>{formatDate(po.orderDate)}</TableCell>
                        <TableCell>{formatDate(po.createdAt)}</TableCell>
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
