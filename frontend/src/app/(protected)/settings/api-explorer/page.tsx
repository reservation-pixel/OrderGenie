'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useOutlets } from '@/hooks/useOutlets';
import { usePetpoojaExplorer } from '@/hooks/usePetpoojaExplorer';
import { downloadCsv } from '@/lib/csv';
import { triggerBlobDownload } from '@/lib/download';
import { ExplorerResults } from '@/components/petpooja-explorer/ExplorerResults';
import { ReceivedPurchaseOrdersTab } from '@/components/petpooja-explorer/ReceivedPurchaseOrdersTab';
import { WebhookDeliveryLogTab } from '@/components/petpooja-explorer/WebhookDeliveryLogTab';
import type { ExplorerApiType, ExplorerResult, Outlet } from '@/types/api';

type TabId = ExplorerApiType | 'purchase_order_webhook';

const TAB_CONFIG: Record<TabId, { label: string; hint: string; unit: string }> = {
  orders: { label: 'Orders API', hint: "T-1: enter today's date to get yesterday's orders", unit: 'day' },
  purchase: { label: 'Purchase API', hint: 'Date range must be 1 month or less; 50 records per call', unit: 'window' },
  transfer: {
    label: 'Inventory Transfer API',
    hint: 'Unverified — Petpooja\'s own docs claim this endpoint exists, but it currently returns "Invalid request" for every call. This tab shows the real response so you can see for yourself.',
    unit: 'window',
  },
  purchase_order_webhook: {
    label: 'Purchase Order (Webhook)',
    hint: 'Inbound only — Petpooja pushes PO data to our server when a PO is saved on their end. This tab reads what the webhook has already stored locally; it does not make a live Petpooja call.',
    unit: 'window',
  },
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function eligibleOutlets(outlets: Outlet[] | undefined, apiType: TabId): Outlet[] {
  if (!outlets || apiType === 'purchase_order_webhook') return [];
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
  const [apiType, setApiType] = useState<TabId>('orders');
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ExplorerResult | null>(null);
  const [webhookSubTab, setWebhookSubTab] = useState<'processed' | 'raw-log'>('processed');

  const { data: outlets } = useOutlets();
  const explorer = usePetpoojaExplorer();

  const outletsForTab = useMemo(() => eligibleOutlets(outlets, apiType), [outlets, apiType]);

  function handleTabChange(value: string) {
    setApiType(value as TabId);
    setSelectedOutletIds([]);
    setResult(null);
    setExpanded(new Set());
  }

  function toggleOutlet(id: string, checked: boolean) {
    setSelectedOutletIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function handleFetch() {
    if (apiType === 'purchase_order_webhook') return;
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
          {(Object.keys(TAB_CONFIG) as TabId[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_CONFIG[t].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(TAB_CONFIG) as TabId[]).map((t) => (
          <TabsContent key={t} value={t} className="space-y-4">
            <p className="text-sm text-muted-foreground">{TAB_CONFIG[t].hint}</p>

            {t === 'purchase_order_webhook' ? (
              <Tabs value={webhookSubTab} onValueChange={(v) => setWebhookSubTab(v as 'processed' | 'raw-log')}>
                <TabsList>
                  <TabsTrigger value="processed">Processed Purchase Orders</TabsTrigger>
                  <TabsTrigger value="raw-log">Webhook Delivery Log</TabsTrigger>
                </TabsList>
                <TabsContent value="processed" className="space-y-4">
                  <ReceivedPurchaseOrdersTab />
                </TabsContent>
                <TabsContent value="raw-log" className="space-y-4">
                  <WebhookDeliveryLogTab />
                </TabsContent>
              </Tabs>
            ) : (
              <>
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
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
