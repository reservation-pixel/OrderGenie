'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/shared/Pagination';
import { ItemDetailDialog } from '@/components/item-sales/ItemDetailDialog';
import { useItemSales } from '@/hooks/useSales';
import { useItemCategories } from '@/hooks/useItemCategories';
import { formatCurrency, formatNumber } from '@/lib/format';

export default function ItemSalesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<'top' | 'least'>('top');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const { data, isLoading, isError } = useItemSales(page, 25, {
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
    sort,
  });
  const { data: categories } = useItemCategories();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Item Sales</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-[180px]"
          />
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v ?? 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setSort((s) => (s === 'top' ? 'least' : 'top'))}>
            <ArrowUpDown className="mr-1 h-4 w-4" />
            {sort === 'top' ? 'Top Selling' : 'Least Selling'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">Failed to load item sales.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((i) => (
                      <TableRow
                        key={i.itemName}
                        className="cursor-pointer"
                        onClick={() => setSelectedItem(i.itemName)}
                      >
                        <TableCell className="font-medium">{i.itemName}</TableCell>
                        <TableCell>{i.category ?? '—'}</TableCell>
                        <TableCell className="text-right">{formatNumber(i.quantitySold)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(i.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(i.averagePrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(i.discount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(i.tax)}</TableCell>
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

      <ItemDetailDialog itemName={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
