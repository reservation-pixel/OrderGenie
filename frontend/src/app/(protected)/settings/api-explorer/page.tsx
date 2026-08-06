'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, FileJson } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOutlets } from '@/hooks/useOutlets';
import { usePetpoojaExplorer } from '@/hooks/usePetpoojaExplorer';
import { formatCurrency, formatNumber } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { triggerBlobDownload } from '@/lib/download';
import type {
  ExplorerApiType,
  ExplorerOrderRecord,
  ExplorerPurchaseRecord,
  ExplorerResult,
  ExplorerTransferRecord,
  Outlet,
} from '@/types/api';

const TAB_CONFIG: Record<ExplorerApiType, { label: string; hint: string; unit: string }> = {
  orders: { label: 'Orders API', hint: "T-1: enter today's date to get yesterday's orders", unit: 'day' },
  purchase: { label: 'Purchase API', hint: 'Date range must be 1 month or less; 50 records per call', unit: 'window' },
  transfer: {
    label: 'Inventory Transfer API',
    hint: 'Unverified — Petpooja\'s own docs claim this endpoint exists, but it currently returns "Invalid request" for every call. This tab shows the real response so you can see for yourself.',
    unit: 'window',
  },
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function eligibleOutlets(outlets: Outlet[] | undefined, apiType: ExplorerApiType): Outlet[] {
  if (!outlets) return [];
  if (apiType === 'orders') return outlets.filter((o) => o.salesSyncCode);
  if (apiType === 'transfer') return outlets.filter((o) => o.inventorySyncCode);
  return outlets.filter((o) => o.salesSyncCode || o.inventorySyncCode);
}

function dayCount(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1);
}

export default function ApiExplorerPage() {
  const [apiType, setApiType] = useState<ExplorerApiType>('orders');
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ExplorerResult | null>(null);

  const { data: outlets } = useOutlets();
  const explorer = usePetpoojaExplorer();

  const outletsForTab = useMemo(() => eligibleOutlets(outlets, apiType), [outlets, apiType]);

  function handleTabChange(value: string) {
    setApiType(value as ExplorerApiType);
    setSelectedOutletIds([]);
    setResult(null);
    setExpanded(new Set());
  }

  function toggleOutlet(id: string, checked: boolean) {
    setSelectedOutletIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function handleFetch() {
    setExpanded(new Set());
    explorer.mutate(
      { apiType, outletIds: selectedOutletIds, fromDate, toDate },
      { onSuccess: (data) => setResult(data) }
    );
  }

  const units = dayCount(fromDate, toDate);
  const fetchLabel =
    apiType === 'orders'
      ? `Fetch ${selectedOutletIds.length} outlet${selectedOutletIds.length === 1 ? '' : 's'} × ${units} day${units === 1 ? '' : 's'}`
      : `Fetch ${selectedOutletIds.length} outlet${selectedOutletIds.length === 1 ? '' : 's'} × 1 window`;

  function exportCsv() {
    if (!result || result.records.length === 0) return;
    const rows = result.records.map((r) => {
      const flat: Record<string, unknown> = { ...r };
      if ('items' in flat) {
        flat.items = JSON.stringify((flat as { items?: unknown }).items);
      }
      if ('raw' in flat) {
        flat.raw = JSON.stringify((flat as { raw?: unknown }).raw);
      }
      return flat;
    });
    downloadCsv(`petpooja-${apiType}-${fromDate}-to-${toDate}.csv`, rows);
  }

  function exportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    triggerBlobDownload(blob, `petpooja-${apiType}-${fromDate}-to-${toDate}.json`);
  }

  return (
    <div className="space-y-4">
      <Tabs value={apiType} onValueChange={handleTabChange}>
        <TabsList>
          {(Object.keys(TAB_CONFIG) as ExplorerApiType[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_CONFIG[t].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(TAB_CONFIG) as ExplorerApiType[]).map((t) => (
          <TabsContent key={t} value={t} className="space-y-4">
            <p className="text-sm text-muted-foreground">{TAB_CONFIG[t].hint}</p>

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="fromDate">Start Date</Label>
                <input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="toDate">End Date</Label>
                <input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">
                  Outlets ({selectedOutletIds.length}/{outletsForTab.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedOutletIds(outletsForTab.map((o) => o.id))}>
                    All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedOutletIds([])}>
                    None
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {outletsForTab.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`outlet-${o.id}`}
                        checked={selectedOutletIds.includes(o.id)}
                        onCheckedChange={(c) => toggleOutlet(o.id, c === true)}
                      />
                      <Label htmlFor={`outlet-${o.id}`} className="text-sm font-normal">
                        {o.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              disabled={selectedOutletIds.length === 0 || explorer.isPending}
              onClick={handleFetch}
            >
              {explorer.isPending ? 'Fetching...' : fetchLabel}
            </Button>

            {result && result.apiType === t && (
              <ExplorerResults result={result} expanded={expanded} setExpanded={setExpanded} onExportCsv={exportCsv} onExportJson={exportJson} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ExplorerResults({
  result,
  expanded,
  setExpanded,
  onExportCsv,
  onExportJson,
}: {
  result: ExplorerResult;
  expanded: Set<number>;
  setExpanded: (s: Set<number>) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}) {
  function toggleRow(i: number) {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Records" value={formatNumber(result.recordCount)} />
        <StatCard label="Outlets with data" value={`${result.outletsWithData}/${result.outletsRequested}`} />
        <StatCard label="API calls" value={formatNumber(result.apiCallCount)} />
        <StatCard label="Elapsed" value={`${(result.elapsedMs / 1000).toFixed(1)}s`} />
        <StatCard label="Total value" value={formatCurrency(result.totalValue)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {result.perOutlet.map((o) => (
          <Badge key={o.outletId} variant={o.error ? 'destructive' : o.count > 0 ? 'secondary' : 'outline'} title={o.error}>
            {o.outletName}: {o.error ? 'error' : o.count}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Records</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExportCsv} disabled={result.records.length === 0}>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onExportJson}>
              <FileJson className="mr-1 h-4 w-4" />
              JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {result.records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records returned.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                {result.apiType === 'orders' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead />
                        <TableHead>Outlet</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(result.records as ExplorerOrderRecord[]).map((r, i) => (
                        <OrderRows key={i} row={r} index={i} expanded={expanded.has(i)} onToggle={() => toggleRow(i)} />
                      ))}
                    </TableBody>
                  </>
                )}
                {result.apiType === 'purchase' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead />
                        <TableHead>Outlet</TableHead>
                        <TableHead>Purchase ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Invoice Date</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(result.records as ExplorerPurchaseRecord[]).map((r, i) => (
                        <PurchaseRows key={i} row={r} index={i} expanded={expanded.has(i)} onToggle={() => toggleRow(i)} />
                      ))}
                    </TableBody>
                  </>
                )}
                {result.apiType === 'transfer' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Raw Record</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(result.records as ExplorerTransferRecord[]).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.outletName}</TableCell>
                          <TableCell className="font-mono text-xs">{JSON.stringify(r.raw)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function OrderRows({
  row,
  index,
  expanded,
  onToggle,
}: {
  row: ExplorerOrderRecord;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow key={index} className="cursor-pointer" onClick={onToggle}>
        <TableCell>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
        <TableCell>{row.outletName}</TableCell>
        <TableCell className="font-medium">{row.orderId}</TableCell>
        <TableCell>{row.date}</TableCell>
        <TableCell>{row.orderType ?? '—'}</TableCell>
        <TableCell>{row.paymentType ?? '—'}</TableCell>
        <TableCell>{row.status ?? '—'}</TableCell>
        <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
        <TableCell className="text-right">{row.items.length}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/30">
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
                  {row.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category ?? '—'}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function PurchaseRows({
  row,
  index,
  expanded,
  onToggle,
}: {
  row: ExplorerPurchaseRecord;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow key={index} className="cursor-pointer" onClick={onToggle}>
        <TableCell>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
        <TableCell>{row.outletName}</TableCell>
        <TableCell className="font-medium">{row.purchaseId}</TableCell>
        <TableCell>{row.type ?? '—'}</TableCell>
        <TableCell>{row.invoiceNumber ?? '—'}</TableCell>
        <TableCell>{row.invoiceDate ?? '—'}</TableCell>
        <TableCell>{row.supplierName ?? '—'}</TableCell>
        <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
        <TableCell>{row.payment ?? '—'}</TableCell>
        <TableCell>{row.status ?? '—'}</TableCell>
        <TableCell className="text-right">{row.items.length}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={11} className="bg-muted/30">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {row.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category ?? '—'}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                      <TableCell>{item.unit ?? '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
