import type { PetpoojaPurchaseItem, PetpoojaPurchaseRecord } from '../types';

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parsePetpoojaDate(value: string | undefined): Date {
  if (!value) return new Date();
  return new Date(value.includes('T') ? value : `${value}T00:00:00Z`);
}

/**
 * Confirmed live: Petpooja's get_purchase records cover both real vendor purchases
 * and internal inter-outlet transfers. `is_transfer_only === '1'` (paired with
 * receiver_type "Kitchen" instead of "Supplier") marks a transfer; everything else
 * with a real receiver_type "Supplier" is a genuine vendor purchase.
 */
export function isTransferRecord(record: PetpoojaPurchaseRecord): boolean {
  return record.restaurant_details?.is_transfer_only === '1' || record.receiver_type === 'Kitchen';
}

export interface MappedPurchaseItem {
  itemName: string;
  quantity: number;
  unit: string | null;
  rate: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  receivedQty: number;
  pendingQty: number;
}

function mapPurchaseItem(item: PetpoojaPurchaseItem): MappedPurchaseItem {
  const quantity = num(item.qty);
  const rate = num(item.price);
  const amount = num(item.amount, quantity * rate);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const taxSlots: Array<[string | undefined, number]> = [
    [item.tax1_label, num(item.tax1_amount)],
    [item.tax2_label, num(item.tax2_amount)],
    [item.tax3_label, num(item.tax3_amount)],
  ];
  for (const [label, amt] of taxSlots) {
    const l = label?.toUpperCase();
    if (l === 'CGST') cgst += amt;
    else if (l === 'SGST') sgst += amt;
    else if (l === 'IGST') igst += amt;
  }

  const receivedQty = quantity; // get_purchase only returns completed/active receipts, not pending POs
  return {
    itemName: item.itemname ?? 'Unknown Item',
    quantity,
    unit: item.lbl_unit ?? null,
    rate,
    amount,
    cgst,
    sgst,
    igst,
    cess: 0,
    receivedQty,
    pendingQty: 0,
  };
}

export interface MappedPurchase {
  poNumber: string;
  petpoojaPurchaseId: string;
  invoiceNumber: string | null;
  orderDate: Date;
  vendorName: string | null;
  vendorPetpoojaId: string | null;
  vendorPhone: string | null;
  totalAmount: number;
  taxAmount: number;
  rawPayload: PetpoojaPurchaseRecord;
  items: MappedPurchaseItem[];
}

export function mapPetpoojaPurchase(record: PetpoojaPurchaseRecord): MappedPurchase {
  const items = (record.item_details ?? []).map(mapPurchaseItem);
  const itemTax = items.reduce((s, i) => s + i.cgst + i.sgst + i.igst + i.cess, 0);
  const taxAmount = num(record.total_tax, itemTax);
  const receiver = record.restaurant_details?.receiver;
  // Petpooja's own human-readable PO reference (what its portal displays) — only
  // populated for internal transfers in practice, not regular vendor purchases, so
  // this is additive to the synthetic fallback, not a full replacement for it.
  const reference = record.restaurant_details?.reference_number || record.restaurant_details?.po_invoice_number;

  return {
    poNumber: reference?.trim() || `PO-${record.purchase_id}`,
    petpoojaPurchaseId: record.purchase_id,
    invoiceNumber: record.invoice_number || null,
    orderDate: parsePetpoojaDate(record.invoice_date ?? record.created_on),
    vendorName: receiver?.receiver_name?.trim() || null,
    vendorPetpoojaId: record.receiver_id ?? null,
    vendorPhone: receiver?.receiver_contact || null,
    totalAmount: num(record.total, items.reduce((s, i) => s + i.amount, 0) + taxAmount),
    taxAmount,
    rawPayload: record,
    items,
  };
}
