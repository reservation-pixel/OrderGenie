import { env } from '../../config/env';
import { formatDateDDMMYYYY } from '../../utils/dateRange';
import { petpoojaRequest } from './client';
import type { PetpoojaCredentials, PetpoojaPurchaseRecord, PetpoojaPurchaseResponse } from './types';

const MAX_PAGES = 50; // 50 records/page confirmed live; hard cap to avoid runaway loops
const MAX_RANGE_DAYS = 31; // Petpooja enforces "date range of maximum 1 month" — confirmed live

function chunkDateRange(fromDate: Date, toDate: Date): Array<{ from: Date; to: Date }> {
  const chunks: Array<{ from: Date; to: Date }> = [];
  let chunkStart = new Date(fromDate);

  while (chunkStart <= toDate) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + MAX_RANGE_DAYS - 1);
    chunks.push({ from: new Date(chunkStart), to: chunkEnd > toDate ? toDate : chunkEnd });
    chunkStart = new Date(chunkEnd);
    chunkStart.setDate(chunkStart.getDate() + 1);
  }

  return chunks;
}

async function fetchPurchasesInRange(
  credentials: PetpoojaCredentials,
  restID: string,
  fromDate: Date,
  toDate: Date,
  onRequest?: () => void
): Promise<PetpoojaPurchaseRecord[]> {
  const allPurchases: PetpoojaPurchaseRecord[] = [];
  let refId = '';

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await petpoojaRequest<PetpoojaPurchaseResponse>({
      url: env.PETPOOJA_PURCHASE_BASE_URL,
      method: 'POST',
      onRequest,
      body: {
        app_key: credentials.appKey,
        app_secret: credentials.appSecret,
        access_token: credentials.accessToken,
        restID,
        from_date: formatDateDDMMYYYY(fromDate),
        to_date: formatDateDDMMYYYY(toDate),
        refId,
      },
    });

    // `purchases` is `""` (empty string) when there are no records, or an array otherwise.
    const purchases = Array.isArray(response.purchases) ? response.purchases : [];
    allPurchases.push(...purchases);

    if (purchases.length < 50) break; // fewer than a full page means no more data
    const last = purchases[purchases.length - 1];
    if (!last?.purchase_id) break;
    refId = last.purchase_id;
  }

  return allPurchases;
}

/**
 * `purchases` records returned here cover BOTH real vendor purchases and internal
 * inventory transfers between outlets (confirmed live — see mapper for the
 * discriminator). Petpooja enforces a max 1-month date range per call, so longer
 * ranges are chunked into sequential requests.
 */
export async function fetchPurchases(
  credentials: PetpoojaCredentials,
  restID: string,
  fromDate: Date,
  toDate: Date,
  onRequest?: () => void
): Promise<PetpoojaPurchaseRecord[]> {
  const chunks = chunkDateRange(fromDate, toDate);
  const results: PetpoojaPurchaseRecord[] = [];
  for (const chunk of chunks) {
    results.push(...(await fetchPurchasesInRange(credentials, restID, chunk.from, chunk.to, onRequest)));
  }
  return results;
}

export { fetchPurchasesInRange, MAX_RANGE_DAYS };
