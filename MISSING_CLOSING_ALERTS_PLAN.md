# Alert super admins when an outlet hasn't entered Actual Closing

## Context

Reconciliation only works if each outlet types its Actual Closing each day — the next morning's
Opening carries over from it. When an outlet skips a day nobody finds out until someone opens that
outlet's page and sees the gap; the 18 Sep Vesu problem started exactly that way.

The ask: by 8 AM, a super admin should be told which outlets didn't fill in yesterday's closing.

Decided with the user: **in-app** (a bell in the header, not email or WhatsApp), an outlet counts as
missing if **any** tracked item lacks a closing, showing the **last 3 days**, and a day starts
showing at **8 AM India time** the next morning.

What exists today, from reading the code:
- **No notification anything.** No `Notification` table, no bell in `components/layout/`, no email,
  WhatsApp, push or outbound webhook in the whole backend. `NotificationSetting` holds three
  booleans that nothing ever reads. This is the first alerting path in the app.
- **"Not entered" is an absent row or `closingStock = 0`** in `Inventory`
  (`@@unique([outletId, itemName, stockDate])`). `clearAllClosingsForDay` deletes rows outright when
  nothing else is on them.
- **The expected item set** for an outlet-day already exists as `getIngredientItemNames(outletId,
  brand, day)` in `backend/src/services/reconciliation/reconciliation.service.ts` — Class A ITEM
  entries plus category-expanded sold items. It drives the grid, so reusing it keeps the alert and
  the page in agreement. It's private today and needs exporting.

## Approach: compute on demand, no new table, no cron

The bell asks the server what's missing right now. Nothing is stored, so an alert disappears by
itself the moment the outlet fills its figures in — no job to run, no state to go stale, and no
dismissals to manage. The 8 AM rule is a filter on which days are eligible, not a scheduled job.

### Backend — `src/services/alerts/missingClosings.service.ts` (new)
- `getMissingClosings()`:
  - Outlets: active ones whose brand has Class A items — the KG stores track no reconciliation, so
    they can't be "missing" anything.
  - Days: the last 3 completed days, each included only once 08:00 IST has passed on the day after
    it. Reuses the `istHourMinute` helper pattern from `src/cron/index.ts` and `CRON_TIMEZONE`.
  - For each outlet-day: expected names from `getIngredientItemNames`, then count how many have a
    row with `closingStock > 0`. One `Inventory.findMany` covers every outlet and all three days.
  - Returns only the shortfalls: `{ outletId, outletName, brand, date, expected, filled, missing }`,
    newest day first.
- Cost is one query per outlet for the category expansion (~6 relevant outlets) plus one inventory
  query, behind a 60-second in-process cache so a polling bell doesn't re-run it per tab.

### Backend — API
`src/controllers/alerts.controller.ts`, `src/routes/alerts.routes.ts`, registered as `/alerts` in
`src/routes/index.ts`: `GET /api/alerts/missing-closings`, gated `verifyJwt` +
`requireRole(RoleName.SUPER_ADMIN)` — this spans every outlet, so it stays super-admin only, like
the Activity Log.

### Frontend
- `src/hooks/useAlerts.ts`: `useMissingClosings()`, enabled only when the signed-in role is
  SUPER_ADMIN, `refetchInterval` 5 minutes and refetch on window focus.
- `src/components/layout/AlertsBell.tsx`: a bell with a count badge in the right-hand slot of
  `Header.tsx` (currently empty apart from the avatar). Its popover lists each outlet-day as
  "Capiche (Vesu) · 10 Oct · 0 of 13 entered". Nothing missing → a quiet "All outlets up to date",
  and no badge.
- Clicking a line opens that outlet's Reconciliation for that date: set `outletId` and `customTo` on
  the existing `useFilterStore`, then route to `/{brand}/reconciliation` — the page already reads
  the date from that store, so no new URL handling.
- Non-super-admins render nothing at all, so their header is unchanged.

## Verification
1. `tsc --noEmit` both workspaces, `npm run build` on the frontend.
2. Locally, against the real data: delete one outlet's closings for a day and confirm the endpoint
   reports it with the right expected/filled counts, then re-enter one item and confirm the count
   moves rather than the line vanishing.
3. Confirm an outlet with everything filled never appears, and KG outlets never appear.
4. Check the 8 AM rule by calling the service with a stubbed clock at 07:59 and 08:01 IST —
   yesterday appears only in the second case.
5. Confirm ADMIN gets 403 on the endpoint and sees no bell.
6. Put the local data back as found.
