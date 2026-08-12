'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { useReconciliation, useUpsertReconciliationEntry } from '@/hooks/useReconciliation';
import { useAddClassAItem, useRemoveClassAItem } from '@/hooks/useClassAItems';
import { useResettingPage } from '@/hooks/useResettingPage';
import { useFilterStore } from '@/store/filterStore';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatNumber } from '@/lib/format';
import type { ReconciliationRow } from '@/types/api';

const VARIANCE_ALERT_PCT = 10;

function sanitizeQty(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function varianceBadge(variance: number, base: number) {
  const pct = base !== 0 ? (Math.abs(variance) / Math.abs(base)) * 100 : variance !== 0 ? 100 : 0;
  const alert = pct > VARIANCE_ALERT_PCT;
  return (
    <Badge variant={alert ? 'destructive' : 'secondary'}>
      {variance > 0 ? '+' : ''}
      {formatNumber(variance)}
    </Badge>
  );
}

export function BrandReconciliationTab({ brand, outletId }: { brand: string; outletId: string }) {
  const { customTo } = useFilterStore();
  const { user } = useAuthStore();
  const isHeadChef = user?.role === 'HEAD_CHEF';
  const date = customTo ?? todayIso();
  const filterKey = `${outletId}|${brand}|${date}`;
  const [page, setPage] = useResettingPage(filterKey);
  const { data, isLoading, isError } = useReconciliation(page, 25, outletId, brand, date);
  const addClassAItem = useAddClassAItem();

  const [newItemName, setNewItemName] = useState('');
  const isAllOutlets = outletId === 'all';

  function handleAddIngredient() {
    if (!newItemName.trim() || isAllOutlets) return;
    addClassAItem.mutate(
      { brand, type: 'ITEM', value: newItemName.trim() },
      { onSuccess: () => setNewItemName('') }
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingredient Reconciliation</CardTitle>
          <CardDescription>
            Showing reconciliation for <strong>{formatDate(date)}</strong> — only items selected in{' '}
            <strong>Class A Items</strong> for {brand} appear here. Opening and Actual Closing are entered manually;
            Sales/PO are pulled from real synced data; Predicted values use an imported forecast where one's
            available for that item and date, falling back to a 7-day trailing average otherwise. Change the date
            via the date filter above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAllOutlets ? (
            <p className="text-sm text-muted-foreground">Select a specific outlet above to view its reconciliation.</p>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">Failed to load reconciliation data.</p>
          ) : data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isHeadChef
                ? 'No items selected yet for this outlet.'
                : (
                  <>
                    No items selected yet. Add one below, or manage categories in{' '}
                    <a href={`/${brand.toLowerCase()}/class-a-items`} className="underline">
                      Class A Items
                    </a>
                    .
                  </>
                )}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Closing (AI)</TableHead>
                      <TableHead className="text-right">Actual Closing</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Sales (AI)</TableHead>
                      <TableHead className="text-right">PO</TableHead>
                      <TableHead className="text-right">Next Day Opening</TableHead>
                      <TableHead className="text-right">+15%</TableHead>
                      <TableHead className="text-right">Sales Variance</TableHead>
                      <TableHead className="text-right">Closing Variance</TableHead>
                      <TableHead className="text-right">Wastage</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <ReconciliationRowCells
                        key={row.itemName}
                        row={row}
                        outletId={outletId}
                        brand={brand}
                        date={date}
                        canManageSelection={!isHeadChef}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination meta={data.meta} onPageChange={setPage} />
            </>
          )}

          {!isAllOutlets && !isHeadChef && (
            <div className="flex items-end gap-2 border-t pt-3">
              <div className="space-y-1">
                <Label htmlFor="new-ingredient">Add Ingredient</Label>
                <Input
                  id="new-ingredient"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Flour 1kg"
                  className="h-8 w-56"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!newItemName.trim() || addClassAItem.isPending}
                onClick={handleAddIngredient}
              >
                + Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReconciliationRowCells({
  row,
  outletId,
  brand,
  date,
  canManageSelection,
}: {
  row: ReconciliationRow;
  outletId: string;
  brand: string;
  date: string;
  canManageSelection: boolean;
}) {
  const upsert = useUpsertReconciliationEntry();
  const removeClassAItem = useRemoveClassAItem();
  const [opening, setOpening] = useState(String(row.opening));
  const [actualClosing, setActualClosing] = useState(String(row.actualClosing));

  const dirty = Number(opening) !== row.opening || Number(actualClosing) !== row.actualClosing;

  function handleSave() {
    upsert.mutate({
      outletId,
      itemName: row.itemName,
      date,
      opening: Number(opening),
      actualClosing: Number(actualClosing),
    });
  }

  function handleRemove() {
    removeClassAItem.mutate({ id: row.classAItemId, brand });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {row.itemName}
        {!row.hasManualEntry && (
          <Badge variant="outline" className="ml-2">
            Not entered
          </Badge>
        )}
      </TableCell>
      <TableCell>{row.unit ?? '—'}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          step="1"
          min="0"
          value={opening}
          onChange={(e) => setOpening(sanitizeQty(e.target.value))}
          className="h-8 w-24 text-right"
        />
      </TableCell>
      <TableCell className="text-right">{formatNumber(row.factualClosingAI)}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          step="1"
          min="0"
          value={actualClosing}
          onChange={(e) => setActualClosing(sanitizeQty(e.target.value))}
          className="h-8 w-24 text-right"
        />
      </TableCell>
      <TableCell className="text-right">{formatNumber(row.salesToday)}</TableCell>
      <TableCell className="text-right">{formatNumber(row.predictedSales)}</TableCell>
      <TableCell className="text-right">{formatNumber(row.poToday)}</TableCell>
      <TableCell className="text-right">{formatNumber(row.nextDayOpening)}</TableCell>
      <TableCell className="text-right">{formatNumber(row.nextDayOpeningBuffered)}</TableCell>
      <TableCell className="text-right">{varianceBadge(row.salesVariance, row.predictedSales)}</TableCell>
      <TableCell className="text-right">{varianceBadge(row.closingVariance, row.factualClosingAI)}</TableCell>
      <TableCell className="text-right">
        <Badge variant={row.derivedWastage > 0 ? 'destructive' : 'secondary'}>{formatNumber(row.derivedWastage)}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={!dirty || upsert.isPending} onClick={handleSave}>
            Save
          </Button>
          {canManageSelection && (
            <button
              type="button"
              onClick={handleRemove}
              title="Remove from selection"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
