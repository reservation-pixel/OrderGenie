import type { PetpoojaOrderItem, PetpoojaOrderRecord } from '../types';
import { dateOnlyUtc } from '../../../utils/dateRange';

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parsePetpoojaDateTime(value: string | undefined): Date {
  if (!value) return new Date();
  // Petpooja sends "YYYY-MM-DD HH:mm:ss" — not ISO 8601, needs a "T" to parse reliably.
  return new Date(value.includes('T') ? value : value.replace(' ', 'T'));
}

function parseYyyyMmDdUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return dateOnlyUtc(year, month - 1, day);
}

export interface MappedSaleItem {
  itemName: string;
  category: string | null;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
}

function mapItem(item: PetpoojaOrderItem): MappedSaleItem {
  const quantity = num(item.quantity, 1);
  const price = num(item.price);
  const discount = num(item.total_discount);
  const tax = num(item.total_tax);
  const grossLine = num(item.total, price * quantity);

  return {
    itemName: item.name ?? 'Unknown Item',
    category: item.categoryname ?? null,
    quantity,
    price,
    discount,
    tax,
    total: grossLine - discount + tax,
  };
}

export interface MappedSale {
  invoiceNumber: string;
  petpoojaOrderId: string | null;
  orderDateTime: Date;
  orderDate: Date;
  customerName: string | null;
  customerPhone: string | null;
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paymentMode: string;
  orderType: string | null;
  rawPayload: PetpoojaOrderRecord;
  items: MappedSaleItem[];
}

/**
 * Petpooja's Order object has no distinct "invoice number" field — `orderID` is the
 * closest stable per-restaurant identifier, so it's used as both the invoice number
 * (for the PRD's "Invoice Number" column) and the raw petpoojaOrderId.
 */
export function mapPetpoojaOrder(record: PetpoojaOrderRecord): MappedSale {
  const { Order: order, Customer: customer } = record;
  const items = (record.OrderItem ?? []).map(mapItem);

  const orderDateTime = parsePetpoojaDateTime(order.created_on);
  const orderDate = order.order_date
    ? parseYyyyMmDdUtc(order.order_date)
    : dateOnlyUtc(orderDateTime.getFullYear(), orderDateTime.getMonth(), orderDateTime.getDate());

  const discount = num(order.discount_total);
  const tax = num(order.tax_total);
  const net = num(order.total, num(order.core_total) - discount + tax);
  const gross = num(order.core_total, net - tax + discount);

  return {
    invoiceNumber: order.orderID,
    petpoojaOrderId: order.orderID,
    orderDateTime,
    orderDate,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    grossAmount: gross,
    discountAmount: discount,
    taxAmount: tax,
    netAmount: net,
    paymentMode: order.payment_type ?? 'Unknown',
    orderType: order.order_type ?? null,
    rawPayload: record,
    items,
  };
}
