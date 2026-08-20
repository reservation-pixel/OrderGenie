# Railway Postgres — Ready-to-Use Diagnostic Queries

> Copy-paste into Railway → Postgres service → **Database → Query**. All queries are read-only (`SELECT`) unless explicitly marked otherwise.
>
> Table/column names are quoted exactly as Prisma creates them (camelCase, case-sensitive) — don't drop the double quotes.

---

## Webhook Delivery Log (`PurchaseOrderWebhookLog`)

Audit trail of every inbound call to `/api/webhooks/petpooja/purchase-order`, success or rejected. Only exists from the point this feature was deployed (2026-08-20) — no history before that.

### 1. Overview — counts by outcome & HTTP status
```sql
SELECT outcome, "httpStatusCode", COUNT(*) AS n
FROM "PurchaseOrderWebhookLog"
GROUP BY outcome, "httpStatusCode"
ORDER BY outcome, "httpStatusCode";
```
Quick health check. All `SUCCESS` rows are `200`. Anything else in `REJECTED` needs the query below to see why.

### 2. Detail on rejected calls — with parsed payload fields
```sql
SELECT
  "receivedAt",
  "poNumber",
  "menuSharingCode",
  "petpoojaPurchaseId",
  "httpStatusCode",
  "failureReason",
  "rawPayload"->'data'->>'receiverType'                             AS receiver_type,
  "rawPayload"->'data'->'restDetails'->'sender'->>'sender_name'     AS sender_name,
  "rawPayload"->'data'->'restDetails'->'receiver'->>'receiver_name' AS receiver_name,
  "rawPayload"->>'app_key'                                          AS app_key_sent,
  "rawPayload"->>'access_token'                                     AS access_token_sent
FROM "PurchaseOrderWebhookLog"
WHERE outcome = 'REJECTED'
ORDER BY "receivedAt" DESC;
```
`receiver_type = 'Kitchen'` means an internal outlet-to-outlet transfer; `'Supplier'` means a real vendor PO. `app_key_sent`/`access_token_sent` let you compare what Petpooja actually sent against what's configured (see query 8) — useful for spotting credential mismatches like the one found 2026-08-20.

### 3. Pattern check — do failures cluster on transfer type?
```sql
SELECT
  "rawPayload"->'data'->>'receiverType' AS receiver_type,
  COUNT(*) AS n,
  MIN("receivedAt") AS first_seen,
  MAX("receivedAt") AS last_seen
FROM "PurchaseOrderWebhookLog"
WHERE outcome = 'REJECTED' AND "httpStatusCode" = 401
GROUP BY "rawPayload"->'data'->>'receiverType';
```
Run this periodically. If `Kitchen` keeps failing while `Supplier` never does (or vice versa), that's solid evidence for a Petpooja support ticket — don't file on a sample of one.

### 4. Full log, most recent first
```sql
SELECT "receivedAt", outcome, "httpStatusCode", "poNumber", "petpoojaPurchaseId", status, "writeResult"
FROM "PurchaseOrderWebhookLog"
ORDER BY "receivedAt" DESC
LIMIT 100;
```

### 5. Cross-reference a webhook log row to its resulting Purchase Order
```sql
SELECT
  l."receivedAt", l."poNumber", l.outcome, l."httpStatusCode",
  po.status AS current_po_status, po."updatedAt" AS po_last_updated
FROM "PurchaseOrderWebhookLog" l
LEFT JOIN "PurchaseOrder" po ON po.id = l."purchaseOrderId"
WHERE l."poNumber" = 'PO0081834904';  -- swap in the PO # you're chasing
```
`current_po_status IS NULL` with a `SUCCESS` outcome usually means the row was later pruned by nightly retention (>7 days old); with a `REJECTED` outcome it means no PO was ever created — check the poll path (query 7) instead.

---

## Purchase Orders (`PurchaseOrder`)

### 6. Status breakdown, per outlet
```sql
SELECT o.name AS outlet, po.status, COUNT(*) AS n
FROM "PurchaseOrder" po
JOIN "Outlet" o ON o.id = po."outletId"
GROUP BY o.name, po.status
ORDER BY o.name, po.status;
```
`PENDING`/`CANCELLED` come from the webhook; `RECEIVED` comes from the 5-minute poll (`get_purchase`). Expect very few lingering `PENDING` rows — they get overwritten to `RECEIVED` once Petpooja finalizes them.

### 7. Find a specific purchase order by Petpooja ID or PO number
```sql
SELECT id, "poNumber", "petpoojaPurchaseId", status, "orderDate", "petpoojaCreatedAt", "totalAmount"
FROM "PurchaseOrder"
WHERE "petpoojaPurchaseId" = '81834904' OR "poNumber" = 'PO0081834904';
```
Empty result + a matching `REJECTED` row in query 2 = the PO exists in Petpooja but never made it into OrderGenie at all yet.

### 8. "Created On" (Petpooja timestamp) backfill coverage
```sql
SELECT
  status,
  COUNT(*) AS total,
  COUNT("petpoojaCreatedAt") AS with_petpooja_created_at,
  COUNT(*) - COUNT("petpoojaCreatedAt") AS missing
FROM "PurchaseOrder"
GROUP BY status;
```
`RECEIVED` rows should trend toward 100% coverage as they get re-synced; `missing` there means either not-yet-resynced-since-the-2026-08-20-migration or run the backfill script (`backend/scripts/backfill-petpooja-created-at.ts`). `PENDING`/`CANCELLED` will **always** show `missing = total` — Petpooja's webhook provides no creation timestamp for those, this is expected, not a bug.

### 9. Duplicate `poNumber` collisions (pre-existing data-integrity issue)
```sql
SELECT "outletId", "poNumber", COUNT(*), array_agg("petpoojaPurchaseId") AS petpooja_ids
FROM "PurchaseOrder"
GROUP BY "outletId", "poNumber"
HAVING COUNT(*) > 1;
```
Should normally return 0 rows — `("outletId","poNumber")` is a unique constraint, so duplicates can't exist as separate rows. This instead helps confirm **rejected** upserts: cross-reference against `SyncLog.errorMessage` (query 12) for `P2002` failures on this constraint, which happen when two distinct Petpooja records synthesize the same fallback `poNumber`.

---

## Outlets (`Outlet`)

### 10. Look up an outlet by its Petpooja sync code
```sql
SELECT id, name, brand, "salesSyncCode", "inventorySyncCode", "isActive"
FROM "Outlet"
WHERE "salesSyncCode" = 'z2ogsrb0' OR "inventorySyncCode" = 'z2ogsrb0';
```
Use this whenever a webhook log row's `menuSharingCode` needs identifying — billing-only outlets (Capiche/Aiko/Bookends) only have `salesSyncCode` set, never `inventorySyncCode`.

### 11. All outlets and which sync codes they have configured
```sql
SELECT name, brand, "outletType", "salesSyncCode", "inventorySyncCode", "isActive"
FROM "Outlet"
ORDER BY brand, name;
```

---

## Sync health (`SyncLog`)

### 12. Recent sync runs, most recent first
```sql
SELECT "syncType", "triggerType", status, "recordsFetched", "recordsCreated", "recordsUpdated", "recordsFailed", "errorMessage", "startedAt", "completedAt"
FROM "SyncLog"
ORDER BY "startedAt" DESC
LIMIT 50;
```
`status = 'PARTIAL'` with `recordsFailed > 0` is where write errors (like the poNumber collision in query 9) surface — `errorMessage` on the outlet-level summary row won't show individual record failures since those are caught per-record and only counted, not logged in detail today.

### 13. Sync failures for a specific outlet
```sql
SELECT sl.*, o.name AS outlet_name
FROM "SyncLog" sl
JOIN "Outlet" o ON o.id = sl."outletId"
WHERE o.name = 'Capiche (Vesu)'  -- swap in outlet name
ORDER BY sl."startedAt" DESC
LIMIT 20;
```

---

## Notes

- All timestamps are stored in UTC. The app's date-range filters convert to IST (`UTC+5:30`, fixed offset, no DST) at query time — if you're eyeballing raw `receivedAt`/`orderDate` values here, add 5:30 to get IST wall-clock time.
- `rawPayload` on both `PurchaseOrder` and `PurchaseOrderWebhookLog` has `app_secret`/`access_token` redacted to `"[REDACTED]"` before storage — never contains real secrets, safe to select and share.
- These queries are read-only. If you ever need to write (e.g., manually clearing a stuck row), open a throwaway transaction and `ROLLBACK` if anything looks wrong before you `COMMIT`.
