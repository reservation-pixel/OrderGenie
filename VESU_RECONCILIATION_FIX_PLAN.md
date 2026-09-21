# Fix Capiche (Vesu) reconciliation from the 17 Sep closing

## Context

Vesu's 17 Sep Actual Closings are entered, for example Big Pizza Dough 26, Small Pizza Dough 12,
Garlic Bread 6, Coke 48. But **every 18 Sep Opening is 0**, when it should be 17 Sep closing plus
18 Sep PO.

From the prod `Inventory` rows (read-only), here is how that happened:
- **18 Sep 10:42:** someone saved the 18 Sep rows (Cassata, Jamun Cheesecake and the rest). 17 Sep had
  no entries yet, so each row was created with `openingStock 0, openingAutoFilled false`.
- **18 Sep 10:43–10:45:** the 17 Sep closings were entered.
- **Result:** carry-forward only refreshes rows that are still auto-filled. It skips any row with
  `openingAutoFilled = false`, so the 18 Sep rows stayed stuck at Opening 0.

19 Sep onwards is fine. For example, 19 Sep Big Pizza Dough opens at 104, which is the 18 Sep closing
of 68 plus a PO of 36. Each day's Opening depends only on the previous day's *Actual* Closing, which
is manual, so fixing 18 Sep doesn't change 19–21 Sep.

**Root cause in code:** `upsertReconciliationEntry` in
`backend/src/services/reconciliation/reconciliation.service.ts` (around line 597) *creates* rows with
`openingAutoFilled: false` even when Opening is just the default 0. Saving a Closing before the
previous day's closing exists therefore freezes Opening at 0 permanently. Any outlet can hit this,
not just Vesu.

## 1. Code fix, so it can't recur
In `upsertReconciliationEntry`, create path:
`openingAutoFilled: !input.opening` (true when Opening is absent or 0).
- A new row with Opening 0 is left to carry-forward, so it fills in as soon as the previous day's
  closing arrives.
- A non-zero Opening typed by a person still takes ownership, as it does today.
- The update path is unchanged. Its existing rule, "hand off only when the number moved", already
  keeps a Closing-only edit from freezing a carried Opening.

## 2. Data fix for Vesu, 18 Sep (prod)
1. Take a one-off backup of the 13 affected rows, as JSON in the scratchpad.
2. Set `openingAutoFilled = true` on Vesu's 18 Sep `Inventory` rows.
3. Load the Vesu 18 Sep reconciliation once, either by opening the page or by calling
   `getReconciliationDashboard` against prod. The existing `carryForwardOpenings` then writes
   Opening = 17 Sep Actual Closing + 18 Sep PO. That PO includes the purchase aliases, so
   Coke → Coke 300 Ml etc. are counted.
4. Take Away Tiramisu has no 17 Sep entry, so its Opening stays 0. That is carry-forward's intended
   "no closing recorded" behaviour.

Actual Closing values are untouched. Only 18 Sep's Opening, and the figures computed from it
(Closing (AI) and Wastage), change.

## Verification
1. Run `tsc --noEmit` for the backend.
2. Re-query prod Vesu 18 Sep. Opening should equal 17 Sep closing + 18 Sep PO for all 12 items that
   have a 17 Sep row.
3. Check that the 19–21 Sep rows are unchanged.
4. Local test of the code fix:
   - Save a Closing for day D+1 before day D has a row.
   - Then save day D's closing.
   - Load D+1: its Opening should now be carried forward instead of stuck at 0.
