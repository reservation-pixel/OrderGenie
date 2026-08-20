# Purchase Order Webhook Visibility + Timezone Fix

## Context

In Settings → API Explorer → "Purchase Order (Webhook)" tab, filtering by status `RECEIVED` for a given day returned no results, and separately there was concern that `PENDING` purchase orders weren't showing up. The request was for a "sequential full fetch" of webhook data to determine what's missing, whether it's our fault, and whether filter conditions (date field, order date vs created-at, PO number, outlet, status) have a bug.

Investigation found:

1. **PENDING is legitimately transient, not necessarily a bug.** The webhook path (`purchaseOrderWebhook.service.ts:79`) only ever writes `PENDING` or `CANCELLED`. The 15-minute poll (`purchaseSync.service.ts:63`, hardcoded `status = 'RECEIVED'`) upserts into the *same row* (same `outletId_petpoojaPurchaseId` key) and overwrites it to `RECEIVED` once Petpooja finalizes the PO. So a fully-synced day can genuinely show zero lingering `PENDING` rows.
2. **The real gap: rejected webhook deliveries leave zero trace.** `petpoojaWebhook.controller.ts` throws `AppError` for malformed payload (400), bad credentials (401), or unresolved outlet (422) — and `error.middleware.ts` explicitly skips `logger.error` for `AppError` instances. There's no request-logging middleware in `app.ts` either. So if Petpooja sends a PO webhook for an outlet whose sync code isn't configured, or a payload Node can't parse, it vanishes with no record anywhere.
3. **Confirmed timezone bug**, app-wide: `backend/src/utils/dateRange.ts` computes day boundaries via `Date.setHours()`, which runs in the server process's local timezone (UTC on Render — no `TZ` env var set anywhere). Selecting a date actually queries a window shifted ~5.5h later than the intended IST calendar day. This is shared by every date-filtered endpoint (Sales, Purchase Orders, Dashboard, Wastage, Reports, etc.), not just this tab.
4. **No bug found** in the status/outlet/PO-number/date-field query mapping between frontend and backend (`purchaseOrders.service.ts:25-64`) — those pass through correctly.

Since webhooks are push-only (Petpooja calls us; there's no Petpooja API to list/replay historical webhook events), "sequential full fetch" isn't possible as a pull-backfill. The equivalent is a **webhook delivery audit log**: record every inbound call — success or rejection — in received order, so it's possible to see exactly what Petpooja sent and why it was or wasn't accepted.

## Approach

### 1. Timezone fix — `backend/src/utils/dateRange.ts`
Replace `startOfDay`/`endOfDay` (currently `Date.setHours`, server-local-timezone-dependent) with fixed-offset IST arithmetic using only `getTime()`/`setUTCHours()` — deterministic regardless of deploy timezone, consistent with the existing `CRON_TIMEZONE = 'Asia/Kolkata'` precedent in `backend/src/config/constants.ts`. No new dependency needed (backend has no date library; IST has no DST).

Swap into all branches of `resolveDateRange` (custom `from`/`to` and all preset cases). Leave `dateOnlyUtc` untouched (solves an unrelated `@db.Date` problem).

### 2. Webhook delivery audit log

**Schema** — new `WebhookOutcome` enum (`SUCCESS`/`REJECTED`) + `PurchaseOrderWebhookLog` model in `backend/prisma/schema.prisma`, plus inverse relation on `Outlet`. Fields: `receivedAt`, nullable `outletId`/`outlet` relation, `petpoojaPurchaseId`, `poNumber`, `menuSharingCode`, `outcome`, `httpStatusCode`, `failureReason`, `status` (derived `PurchaseOrderStatus`, success only), `writeResult` (`created`/`updated`), `purchaseOrderId` (plain string, **not** a Prisma relation — `historicalSync.service.ts` prunes `PurchaseOrder` rows older than 7 days, and a hard FK would eventually hit a constraint failure once logs reference pruned rows), `rawPayload` (Json, credentials redacted).

**Write path** — new `backend/src/services/petpooja/webhookLog.service.ts` with `logPurchaseOrderWebhookCall(input)`: writes one row, redacts `app_secret`/`access_token`, catches its own errors so a broken audit write never breaks the Petpooja-facing response.

`petpoojaWebhook.controller.ts` wraps the existing three-step flow (malformed-payload check → credential check → `handlePurchaseOrderWebhook`) in one try/catch that logs exactly once on every path, then rethrows unchanged — response status codes to Petpooja are byte-identical to before.

`purchaseOrderWebhook.service.ts`'s `PurchaseOrderWebhookResult` gets an additive `status` field so the controller can log the derived status without a second DB query; the controller strips it back out before responding to Petpooja.

**Read API**, mirroring `purchaseOrders.controller.ts`/`purchaseOrders.service.ts`/`purchaseOrders.routes.ts`: `purchaseOrderWebhookLogs.service.ts` / `.controller.ts` / `.routes.ts`, admin-gated like `petpoojaExplorer.routes.ts`, mounted at `/purchase-order-webhook-logs`.

**Frontend** — extends the existing "Purchase Order (Webhook)" tab with a nested sub-tab switch ("Processed Purchase Orders" existing, "Webhook Delivery Log" new): `WebhookDeliveryLogTab.tsx`, `WebhookLogDetailDialog.tsx`, `usePurchaseOrderWebhookLogs.ts` hook, new types in `types/api.ts`.

**Follow-up (non-blocking):** `PurchaseOrderWebhookLog` needs its own retention window (e.g. 30-90 days) added to `historicalSync.service.ts`, since it's intentionally decoupled from the 7-day `PurchaseOrder` retention.

### Explicitly excluded
- No "backfill from Petpooja" — webhooks are push-only.
- No change to `error.middleware.ts`'s global `AppError` handling — logging stays scoped to the webhook path.

## Files touched
- `backend/prisma/schema.prisma`, `backend/src/utils/dateRange.ts`
- `backend/src/controllers/petpoojaWebhook.controller.ts`, `backend/src/services/petpooja/purchaseOrderWebhook.service.ts`
- `backend/src/services/petpooja/webhookLog.service.ts` (new)
- `backend/src/services/purchase/purchaseOrderWebhookLogs.service.ts`, `backend/src/controllers/purchaseOrderWebhookLogs.controller.ts`, `backend/src/routes/purchaseOrderWebhookLogs.routes.ts` (new), `backend/src/routes/index.ts`
- `backend/src/services/sync/historicalSync.service.ts` (follow-up retention, non-blocking)
- `frontend/src/app/(protected)/settings/api-explorer/page.tsx`
- `frontend/src/components/petpooja-explorer/WebhookDeliveryLogTab.tsx`, `WebhookLogDetailDialog.tsx` (new)
- `frontend/src/hooks/usePurchaseOrderWebhookLogs.ts` (new)
- `frontend/src/types/api.ts`

## Verification
1. `npx prisma migrate dev` runs clean, types regenerate.
2. Test POST to `/webhooks/petpooja/purchase-order` for valid / missing-id / bad-credentials / unknown-outlet cases — confirm identical response behavior to before, plus exactly one log row each with correct outcome/reason.
3. `GET /purchase-order-webhook-logs` returns rows in order, filterable, cross-references current `PurchaseOrder` state (or shows pruned).
4. Timezone fix verified against Dashboard "today", Sales list, Purchase Orders, Wastage, Reports around IST midnight boundaries.
5. Frontend: new sub-tab works end to end; existing "Processed Purchase Orders" sub-tab unchanged.
6. `tsc --noEmit` / build clean on both backend and frontend.
