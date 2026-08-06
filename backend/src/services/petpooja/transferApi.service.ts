import { env } from '../../config/env';
import type { PetpoojaCredentials } from './types';

export interface PetpoojaTransferItem {
  item_name: string;
  quantity: number;
  unit?: string;
}

export interface PetpoojaTransfer {
  transfer_number: string;
  transfer_date: string;
  source_rid: string;
  destination_rid: string;
  items: PetpoojaTransferItem[];
}

/**
 * STUB: Petpooja's "Get Transfer API" is referenced in support emails (fields:
 * Transfer Header, Item Details, Source/Destination Outlet, Transfer Date, Transfer
 * Number) but its endpoint URL and exact request/response schema are behind a
 * Petpooja account login we don't have. This function mirrors the call signature
 * shape of fetchPurchases/fetchOrdersForDate so swapping in the real endpoint later
 * only requires changing this one file.
 */
export async function fetchTransfers(
  _credentials: PetpoojaCredentials | null,
  _restID: string,
  _fromDate: Date,
  _toDate: Date
): Promise<PetpoojaTransfer[]> {
  if (!env.ENABLE_STUB_DATA) {
    throw new Error('Petpooja Inventory Transfer API is not yet configured (endpoint undocumented)');
  }
  return [];
}
