import { env } from '../../config/env';
import type { PetpoojaCredentials } from './types';

export interface PetpoojaStockItem {
  item_name: string;
  category?: string;
  unit?: string;
  opening_stock: number;
  purchased_qty: number;
  consumed_qty: number;
  closing_stock: number;
  unit_value: number;
}

/**
 * STUB: no stock-level Inventory API endpoint has been documented or shared by
 * Petpooja at all (only the Purchase and Inventory Transfer APIs are). This
 * mirrors the call signature shape of the other Petpooja fetch functions so the
 * real endpoint can be dropped in later without touching src/services/sync/*.
 */
export async function fetchStockLevels(_credentials: PetpoojaCredentials | null, _restID: string, _asOf: Date): Promise<PetpoojaStockItem[]> {
  if (!env.ENABLE_STUB_DATA) {
    throw new Error('Petpooja Inventory (stock) API is not yet configured (no endpoint documented)');
  }
  return [];
}
