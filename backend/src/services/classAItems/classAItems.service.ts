import { ClassAItemType } from '@prisma/client';
import { prisma } from '../../config/db';
import { resolveDateRange } from '../../utils/dateRange';
import { aggregateItemSales } from '../sales/sales.service';

export async function listClassAItems(brand: string) {
  return prisma.classAItem.findMany({ where: { brand }, orderBy: { createdAt: 'asc' } });
}

export async function addClassAItem(brand: string, type: ClassAItemType, value: string) {
  return prisma.classAItem.upsert({
    where: { brand_type_value: { brand, type, value } },
    update: {},
    create: { brand, type, value },
  });
}

export async function removeClassAItem(id: string) {
  await prisma.classAItem.delete({ where: { id } });
}

export interface ClassAItemSummaryRow {
  key: string;
  itemName: string;
  category: string | null;
  quantitySold: number;
  revenue: number;
  averagePrice: number;
}

export async function getClassAItemsSummary(query: {
  brand: string;
  outletId?: string;
  range?: string;
  from?: string;
  to?: string;
}): Promise<ClassAItemSummaryRow[]> {
  const { from, to } = resolveDateRange(query);
  const [entries, aggregate] = await Promise.all([
    listClassAItems(query.brand),
    aggregateItemSales({ outletId: query.outletId, brand: query.brand, from, to }),
  ]);

  const byNameLower = new Map(aggregate.map((r) => [r.itemName.toLowerCase(), r]));
  const rows: ClassAItemSummaryRow[] = [];

  for (const entry of entries) {
    if (entry.type === ClassAItemType.ITEM) {
      const match = byNameLower.get(entry.value.toLowerCase());
      rows.push({
        key: `item:${entry.value}`,
        itemName: entry.value,
        category: match?.category ?? null,
        quantitySold: match?.quantitySold ?? 0,
        revenue: match?.revenue ?? 0,
        averagePrice: match?.averagePrice ?? 0,
      });
    } else {
      const matches = aggregate.filter((r) => r.category?.toLowerCase() === entry.value.toLowerCase());
      for (const m of matches) {
        rows.push({
          key: `category:${entry.value}:${m.itemName}`,
          itemName: m.itemName,
          category: m.category,
          quantitySold: m.quantitySold,
          revenue: m.revenue,
          averagePrice: m.averagePrice,
        });
      }
    }
  }

  return rows;
}
