# Warn outlet staff at login when their closing isn't filled in

## Context

The super-admin bell (just built) shows which outlets owe an Actual Closing. But the people who can
actually fix it are the outlet's own staff, and they have no idea they're behind until someone
chases them.

This adds a warning for the people on the ground: when a **head chef or outlet manager** signs in
and their outlet has an unfilled day, a panel appears over the middle of the screen for **5 seconds**
and then fades. Tapping it opens Reconciliation on the day that's missing.

Decided with the user: centre overlay (not a toast), **once per login**, for **HEAD_CHEF and
OUTLET_MANAGER** — both are tied to one outlet and both can enter closings.

It reuses the sweep built for the bell in
`backend/src/services/alerts/missingClosings.service.ts`: same "any item missing" rule, same 3-day
window, same 8 AM IST cutoff, same `getIngredientItemNames` definition of what an outlet owes. The
two alerts can't disagree about who is behind.

## Backend

- `missingClosings.service.ts`: `getMissingClosings(now, outletIds?)` — an optional outlet filter
  narrowing the outlet query. The 60-second cache becomes a small `Map` keyed by the scope, so one
  outlet's lookup can't serve the all-outlets answer or the reverse.
- `alerts.routes.ts` / `alerts.controller.ts`: add `GET /api/alerts/my-missing-closings`, gated
  `requireRole(HEAD_CHEF, OUTLET_MANAGER)`. It reads the outlet from `req.user.outletId` and never
  from the query, so one outlet's staff can't ask about another's; a user with no assigned outlet
  gets an empty list rather than everything.
- `GET /api/alerts/missing-closings` stays SUPER_ADMIN-only and unchanged.

## Frontend

- `src/hooks/useAlerts.ts`: `useMyMissingClosings()`, enabled only for those two roles. No polling —
  it's asked once when the app loads, which is all a login-time warning needs.
- `src/components/layout/ClosingReminderOverlay.tsx` (new), rendered inside `AppShell` so it covers
  whichever page they land on:
  - A dimmed backdrop and a centred card: the outlet name, then a line per missing day — "10 Oct —
    0 of 13 items entered".
  - Auto-dismisses after 5 seconds (`setTimeout`, cleared on unmount); clicking the card, the
    backdrop or Escape closes it early.
  - Clicking the card sets `outletId` and the date on `useFilterStore` and routes to
    `/{brand}/reconciliation` for the oldest missing day, the one most at risk of being forgotten.
  - Shown **once per login**: a `sessionStorage` key holding the signed-in user's id, so a reload
    inside the same session stays quiet while the next sign-in shows it again. Wrapped in try/catch
    — private-mode storage failures must not break the page.
  - Renders nothing for other roles, when the list is empty, or while loading.

## Verification

1. `tsc --noEmit` both workspaces, `npm run build` on the frontend.
2. Against the stubbed-database harness used for the bell (the local Postgres needs sudo to start):
   - `GET /api/alerts/my-missing-closings` as HEAD_CHEF returns only that user's outlet, and the
     same figures the super-admin endpoint reports for it.
   - A HEAD_CHEF with no `outletId` gets `[]`, not every outlet.
   - SUPER_ADMIN and ADMIN get 403 on it; HEAD_CHEF still gets 403 on `/missing-closings`.
   - Passing `?outletId=<other outlet>` changes nothing about the response.
3. In the browser as a head chef with a missing day: the overlay appears once, disappears after
   about 5 seconds, reloading doesn't show it again, and signing out and back in does.
4. Confirm a head chef whose outlet is up to date sees nothing at all.
