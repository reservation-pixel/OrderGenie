# Purchase Order Webhook — Actual Format Received (and the open question for Petpooja)

## Update: confirmed via a real production delivery

A genuine, non-test delivery landed on **20 Aug 2026** (`petpoojaPurchaseId 81840140`, `poNumber PO0081840140`, a real inter-outlet transfer — Capiche Ahmedabad 2.0 → Ahmedabad Store 2.0, 4 real line items, real GST/address fields). It sent:

```json
"app_key": "1",
"app_secret": "1",       // non-empty, so redacted in our logs — confirmed by pattern, not directly visible
"access_token": ""
```

This is the **exact same pattern** seen on the earlier test-send delivery. Since a real delivery uses it too, this is not a "test button" quirk — **Petpooja's Purchase Order webhook (API 8) always sends this fixed, non-meaningful credential triplet**, regardless of which real outlet or PO it's for. It never sends the actual Purchase API `app_key` / `app_secret` / `access_token` on file with us.

## What this means

Our webhook currently validates incoming requests by comparing `app_key`/`app_secret`/`access_token` against the same credentials used for the `get_purchase` pull API. Given the evidence above, **that comparison can never succeed for a real Petpooja delivery** — every single PO/transfer webhook Petpooja sends, past or future, will keep getting rejected with `401 Invalid webhook credentials` until this is resolved. This is now a confirmed active production issue, not a documentation gap.

## Comparison: what we're getting vs. what we need

| | What Petpooja actually sends | What's required to authenticate successfully |
|---|---|---|
| `app_key` | `"1"` (literal, fixed, same on every delivery) | The real Purchase API app key already on file with us (a long alphanumeric string, e.g. `uvw0th4nksi97o1bgqp35zjxr6e2may8` — same format as the credential registered for `get_purchase`) |
| `app_secret` | `"1"` (literal, fixed) | The real Purchase API app secret on file (long alphanumeric string) |
| `access_token` | `""` (always empty) | The real Purchase API access token on file (long alphanumeric string) |
| Result | Every delivery — test or real — is rejected with `401 Invalid webhook credentials` before we even look at the outlet or PO data | Every delivery is accepted, PO/transfer is created or updated in OrderGenie |

Everything else in the payload (`menuSharingCode`, `data.id`, `poNumber`, `itemDetails`, `restDetails`, etc.) is already correctly formed and requires no changes — **only the credential triplet is the blocker.**

Two ways to close this gap:
1. **Petpooja starts sending the real Purchase API credentials** in `app_key`/`app_secret`/`access_token` on this webhook, same as they already do for the `get_purchase` pull API — no code change needed on our side.
2. **Petpooja confirms this webhook was never meant to carry those credentials**, and tells us the actual intended auth mechanism (webhook secret, signature header, IP allowlist, etc.) — we then update our validation to match whatever they specify.

## Endpoint & body shape actually being received

```
POST https://ordergenie.bookends.co.in/api/webhooks/petpooja/purchase-order
Content-Type: application/json
```

```json
{
  "restID": "<numeric outlet ID>",
  "menuSharingCode": "<outlet's Menu Sharing Sync Code>",
  "app_key": "1",
  "app_secret": "1",
  "access_token": "",
  "data": {
    "id": "<Petpooja's immutable PO/transfer ID>",
    "restID": "<numeric outlet ID>",
    "menuSharingCode": "<same outlet code>",
    "receiverType": "Supplier | Kitchen",
    "deliveryDate": "YYYY-MM-DD",
    "poNumber": "PO0000000000",
    "totalTax": "0",
    "total": "0.00",
    "roundOff": "0",
    "itemDetails": [
      {
        "itemname": "Item Name",
        "qty": 1,
        "price": 100.0,
        "amount": 100.0,
        "category": "Food",
        "lbl_unit": "Qty",
        "hsn_code": "",
        "sap_code": "",
        "tax1_amount": 0, "tax2_amount": 0, "tax3_amount": 0, "tax4_amount": 0
      }
    ],
    "restDetails": {
      "sender": { "sender_name": "...", "sender_gst": "...", "sender_contact": "...", "sender_city": "...", "sender_state": "...", "sender_address": "..." },
      "receiver": { "receiver_name": "...", "receiver_type": "Supplier | Kitchen", "receiver_contact": "...", "receiver_city": "...", "receiver_state": "...", "receiver_address": "..." }
    },
    "chargeDetails": { "delivery_charge_details": { "...": 0 } },
    "status": "Active"
  }
}
```

Everything except the credential triplet is well-formed and maps cleanly to a real purchase order or internal transfer on our side (`receiverType: "Kitchen"` = internal transfer, `"Supplier"` = real vendor PO).

## What "landed correctly" looks like (once auth is resolved)

**Success — HTTP 200:**
```json
{ "success": true, "data": { "outletId": "...", "purchaseOrderId": "...", "result": "created" } }
```
`"result": "updated"` on redelivery of the same `data.id` — idempotent, no duplicates.

**Current failure — every delivery so far:**
```json
{ "success": false, "message": "Invalid webhook credentials" }
```
HTTP 401.

## Open question for Petpooja

Since the webhook clearly doesn't authenticate via the Purchase/Sales API credential set, ask Petpooja directly: **what is the intended authentication mechanism for the API 8 Purchase Order webhook** — a separate webhook secret issued at registration, an IP allowlist, a signature header, or is `app_key`/`app_secret`/`access_token` simply not meaningful for this specific webhook and should be ignored entirely on the receiving end?

## Interim fix under consideration (our side)

Until Petpooja clarifies, the receiving endpoint's credential check needs to either (a) be relaxed/removed for this webhook specifically, relying on `menuSharingCode` matching a known outlet as the integrity check instead, or (b) be replaced with whatever real mechanism Petpooja confirms. Not yet decided/implemented — flagging here since it directly blocks every real PO webhook from landing today.
