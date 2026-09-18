# Reconciliation: 20 rows per page with pagination (keeping drag-reorder)

## Context

To make drag-reorder work, Reconciliation was switched to one long page (page size 200). The user
now wants **20 rows per page with Previous/Next pagination**, as shown in their Capiche screenshot.
The Super Admin's drag-reorder must keep working, and the saved order must still cover every row,
not just the rows on the current page.

## Approach: fetch all rows once, paginate on the client

This touches only `frontend/src/components/brand-workspace/BrandReconciliationTab.tsx`. The
backend is unchanged.

- **Keep fetching every row in one request**: `useReconciliation(1, 200, …)`.
  - The full `order` array is needed so a save can send the complete brand order. Otherwise a save
    from page 2 would wipe the positions of page 1's items.
  - `page` now only tracks which slice is shown, not what the server returns.
- **Client-side slice:**
  - `const PAGE_SIZE = 20;`
  - `pageStart = (page - 1) * PAGE_SIZE`
  - `pageRows = orderedRows.slice(pageStart, pageStart + PAGE_SIZE)`
  - Clamp `page` if the row count drops, e.g. after a Class A item is removed.
- **Pagination bar:**
  - Reuse the shared `Pagination` component (`components/shared/Pagination.tsx`).
  - Build its meta on the client: `{ page, pageSize: 20, total: orderedRows.length, totalPages: max(1, ceil(total/20)) }`.
  - Show the bar only when `totalPages > 1`.
- **Page reset:** `useResettingPage(filterKey)` already returns to page 1 when the outlet, brand or
  date changes. Keep it.
- **Drag and arrows use global indices:** `dragPropsFor(pageStart + index)`, and the same offset in
  the mobile ↑/↓ `moveRow` calls.
  - Dragging works within the visible page.
  - The mobile ↑ on the first row of a page, and ↓ on the last, still move the row across the page
    boundary, because `moveRow` works on the full list.
  - Saving still sends the whole brand order.
- **Tidy up:** replace the "Every row on one page…" comment with one explaining the client-side
  paging.

## Verification
1. Run `npx tsc --noEmit` and `npm run build` in the frontend.
2. In the browser, on Capiche Reconciliation (about 25 rows):
   - Rows 1–20 appear on page 1 and the rest on page 2, with the bar reading "Page 1 of 2 · N records".
   - Changing the date or outlet returns to page 1.
3. As SUPER_ADMIN:
   - Drag a row on page 2, reload, and check the new order stuck.
   - Check page 1's order is unchanged.
   - As ADMIN, check the same order shows and there are no grip handles.
