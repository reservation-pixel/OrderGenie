import { prisma } from '../../config/db';
import { resolveDateRange, formatDateYYYYMMDD } from '../../utils/dateRange';
import type { ReportColumn } from '../../utils/exporters';
import { listSales, listItemSales } from '../sales/sales.service';
import { listInventory } from '../inventory/inventory.service';
import { listPurchaseOrders } from '../purchase/purchaseOrders.service';
import { getOutletComparison } from '../outlet/outlets.service';
import { AppError } from '../../utils/apiResponse';

export type ReportType = 'sales' | 'item-sales' | 'inventory' | 'purchase-orders' | 'outlet-comparison' | 'tax-summary';

function toNum(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

const UNBOUNDED = { page: '1', pageSize: '100000' };

export async function buildReport(type: ReportType, query: Record<string, string>): Promise<{ columns: ReportColumn[]; rows: Record<string, unknown>[]; title: string }> {
  switch (type) {
    case 'sales': {
      const { rows } = await listSales({ ...query, ...UNBOUNDED });
      return {
        title: 'Sales Report',
        columns: [
          { key: 'invoiceNumber', header: 'Invoice #' },
          { key: 'outletName', header: 'Outlet' },
          { key: 'date', header: 'Date' },
          { key: 'customer', header: 'Customer' },
          { key: 'gross', header: 'Gross' },
          { key: 'discount', header: 'Discount' },
          { key: 'tax', header: 'Tax' },
          { key: 'net', header: 'Net' },
          { key: 'paymentMode', header: 'Payment Mode' },
        ],
        rows: rows.map((r) => ({ ...r, date: new Date(r.date).toISOString().slice(0, 10) })),
      };
    }
    case 'item-sales': {
      const { rows } = await listItemSales({ ...query, ...UNBOUNDED });
      return {
        title: 'Item Sales Report',
        columns: [
          { key: 'itemName', header: 'Item Name' },
          { key: 'category', header: 'Category' },
          { key: 'quantitySold', header: 'Qty Sold' },
          { key: 'revenue', header: 'Revenue' },
          { key: 'averagePrice', header: 'Avg Price' },
          { key: 'discount', header: 'Discount' },
          { key: 'tax', header: 'Tax' },
        ],
        rows,
      };
    }
    case 'inventory': {
      const { rows } = await listInventory({ ...query, ...UNBOUNDED });
      return {
        title: 'Inventory Report',
        columns: [
          { key: 'itemName', header: 'Item' },
          { key: 'outletName', header: 'Outlet' },
          { key: 'category', header: 'Category' },
          { key: 'store', header: 'Store' },
          { key: 'openingStock', header: 'Opening' },
          { key: 'purchasedQty', header: 'Purchased' },
          { key: 'consumedQty', header: 'Consumed' },
          { key: 'closingStock', header: 'Closing' },
          { key: 'stockValue', header: 'Stock Value' },
          { key: 'isLowStock', header: 'Low Stock' },
        ],
        rows: rows.map((r) => ({ ...r, stockDate: undefined, isLowStock: r.isLowStock ? 'Yes' : 'No' })),
      };
    }
    case 'purchase-orders': {
      const { rows } = await listPurchaseOrders({ ...query, ...UNBOUNDED });
      return {
        title: 'Purchase Orders Report',
        columns: [
          { key: 'poNumber', header: 'PO #' },
          { key: 'vendorName', header: 'Vendor' },
          { key: 'outletName', header: 'Outlet' },
          { key: 'status', header: 'Status' },
          { key: 'totalAmount', header: 'Amount' },
          { key: 'orderDate', header: 'Order Date' },
          { key: 'expectedDate', header: 'Expected Date' },
        ],
        rows: rows.map((r) => ({
          ...r,
          orderDate: new Date(r.orderDate).toISOString().slice(0, 10),
          expectedDate: r.expectedDate ? new Date(r.expectedDate).toISOString().slice(0, 10) : '',
        })),
      };
    }
    case 'outlet-comparison': {
      const rows = await getOutletComparison(query);
      return {
        title: 'Outlet Comparison Report',
        columns: [
          { key: 'name', header: 'Outlet' },
          { key: 'brand', header: 'Brand' },
          { key: 'revenue', header: 'Revenue' },
          { key: 'orders', header: 'Orders' },
          { key: 'averageBill', header: 'Average Bill' },
          { key: 'growthPercent', header: 'Growth %' },
        ],
        rows: rows.map((r) => ({ ...r, growthPercent: r.growthPercent === null ? 'N/A' : r.growthPercent.toFixed(1) })),
      };
    }
    case 'tax-summary': {
      const { from, to } = resolveDateRange(query);
      const outlets = await prisma.outlet.findMany({ where: { isActive: true, outletType: 'OUTLET' } });

      const rows = await Promise.all(
        outlets.map(async (o) => {
          const [salesAgg, purchaseItems] = await Promise.all([
            prisma.sale.aggregate({
              where: { outletId: o.id, orderDateTime: { gte: from, lte: to } },
              _sum: { taxAmount: true, netAmount: true },
            }),
            prisma.purchaseOrderItem.findMany({
              where: { purchaseOrder: { outletId: o.id, orderDate: { gte: from, lte: to } } },
              select: { cgst: true, sgst: true, igst: true, cess: true },
            }),
          ]);

          const purchaseGst = purchaseItems.reduce((s, i) => s + toNum(i.cgst) + toNum(i.sgst) + toNum(i.igst) + toNum(i.cess), 0);

          return {
            outletName: o.name,
            brand: o.brand,
            salesTaxCollected: toNum(salesAgg._sum.taxAmount),
            netSales: toNum(salesAgg._sum.netAmount),
            purchaseGstPaid: purchaseGst,
          };
        })
      );

      return {
        title: `Tax Summary Report (${formatDateYYYYMMDD(from)} to ${formatDateYYYYMMDD(to)})`,
        columns: [
          { key: 'outletName', header: 'Outlet' },
          { key: 'brand', header: 'Brand' },
          { key: 'netSales', header: 'Net Sales' },
          { key: 'salesTaxCollected', header: 'Sales Tax Collected' },
          { key: 'purchaseGstPaid', header: 'Purchase GST Paid' },
        ],
        rows,
      };
    }
    default:
      throw new AppError('Unknown report type', 400);
  }
}
