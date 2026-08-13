# Hosting OrderGenie on Render

This guide deploys OrderGenie as **one** Render Web Service — a single combined Node process (`backend/src/combinedServer.ts`) that serves both the Express API and the built Next.js frontend on one origin — plus PostgreSQL. No Redis/BullMQ/RabbitMQ is used; scheduled Petpooja syncs run via `node-cron` inside the same process.

One service means: one URL for the site, one URL to give Petpooja for the webhook, one bill, one thing to redeploy. The tradeoff: frontend and backend now share one process — if it crashes or hangs, both go down together (including the sync cron jobs), and they can't be scaled independently. Acceptable at this app's current scale.

Local dev is unaffected by any of this — `npm run dev` at the repo root still runs two separate processes (backend on :4000, frontend on :3006 via `concurrently`), full hot reload, unchanged. The combined server is a production-only entrypoint.

## 0. Prerequisites

- A Render account.
- Code pushed to `https://github.com/RITURAJSINGHRAJPUT/ordergenie.git` (the remote is already configured locally — commit and push before starting).
- Your real Petpooja credentials (Sales + Purchase app keys/secrets/tokens) — the same values from your local `backend/.env`. `apidocs/`, `api-curls.md`, and all `.env*` files are gitignored, so nothing secret has been pushed; you'll re-enter these directly into Render's dashboard.
- Ownership/DNS access for `bookends.co.in`, if you're pointing `ordergenie.bookends.co.in` at this service (§4).

## 1. PostgreSQL

1. Render Dashboard → **New → PostgreSQL**.
2. Name it (e.g. `ordergenie-db`), choose a region close to where you'll put the web service (same region for both — cross-region adds latency), and a plan (Free is fine to start, but see the note in §5 about instance sizing for an always-on backend).
3. Once created, copy the **Internal Database URL** (not the external one — the internal URL is faster and free, and works because the web service will live in the same Render region/network).

## 2. The combined Web Service

Render **Web Service**, not a Static Site — this is a long-running Node process (Express + embedded Next.js + `node-cron`).

1. Render Dashboard → **New → Web Service** → connect the `ordergenie` GitHub repo.
2. **Root Directory**: leave blank (repo root) — this is an npm-workspaces monorepo, so `npm install` must run from the root to correctly hoist/link shared `node_modules`.
3. **Build Command**:
   ```
   npm install && npm run build -w frontend && npm run build -w backend
   ```
   (Frontend builds first — `next build` needs to run before the backend's combined server can serve it. `backend`'s `postinstall: "prisma generate"` already runs automatically during `npm install`.)
4. **Start Command**:
   ```
   npm run start:combined -w backend
   ```
5. **Environment Variables** (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Internal Database URL from step 1 |
   | `PORT` | *(leave unset — Render injects this automatically; `env.ts` already reads `process.env.PORT`, and `combinedServer.ts` binds to it)* |
   | `NEXT_PUBLIC_API_URL` | `/api` — a **relative** path, since frontend and backend now share one origin. Must be set before the build step runs (`NEXT_PUBLIC_*` vars are inlined into the frontend bundle at `next build` time, not read at runtime) |
   | `CORS_ORIGIN` | Not needed — same-origin requests don't trigger CORS at all. Leave unset (it has a harmless default) |
   | `JWT_SECRET` | A long random string (`openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `1d` |
   | `JWT_REMEMBER_EXPIRES_IN` | `30d` |
   | `ENCRYPTION_KEY` | 64-char hex string (`openssl rand -hex 32`) — used to encrypt stored Petpooja secrets in the DB |
   | `PETPOOJA_SALES_BASE_URL` | `https://api.petpooja.com/V1/thirdparty/generic_get_orders/` |
   | `PETPOOJA_SALES_APP_KEY` / `_APP_SECRET` / `_ACCESS_TOKEN` / `_COOKIE` | Your real Sales/Billing credentials |
   | `PETPOOJA_PURCHASE_BASE_URL` | `https://api.petpooja.com/V1/thirdparty/get_purchase/` |
   | `PETPOOJA_PURCHASE_APP_KEY` / `_APP_SECRET` / `_ACCESS_TOKEN` | Your real Purchase/Inventory credentials |
   | `ENABLE_STUB_DATA` | `true` (Inventory stock-level + Transfer APIs are still unconfirmed/stubbed) |
   | `SEED_ADMIN_EMAIL` | Your admin login email |
   | `SEED_ADMIN_PASSWORD` | A real password — change this from the example default |
   | `NODE_ENV` | **Do not set this one manually.** Render already sets it to `production` automatically at runtime. Setting it explicitly as an env var also affects the *build* step's `npm install`, which then skips `devDependencies` — and `frontend`'s `postcss.config.mjs` needs `@tailwindcss/postcss`, which lives there. Confirmed live: this breaks `next build` with a "Cannot find module" error. |

   `schema.prisma` already declares `binaryTargets = ["native", "debian-openssl-3.0.x"]`, which matches Render's Linux runtime.

6. **Instance Type**: pick at least **Starter** (paid), not Free. Render's free web services spin down after 15 minutes of inactivity — this process relies on in-process `node-cron` jobs (SALES every 5 min, INVENTORY every 10 min, PURCHASE every 15 min, HISTORICAL nightly) that only run while the process is alive. A spun-down free instance would silently stop syncing until the next inbound HTTP request woke it up.
7. Deploy. After the first successful deploy, open the service's **Shell** tab and run the schema + seed once:
   ```
   npm run db:migrate:deploy -w backend
   npm run db:seed -w backend
   ```
   `db:migrate:deploy` runs `prisma migrate deploy` — only applies already-committed migrations non-interactively, safe for production. Never run `db:migrate` (interactive, can generate new migrations) against production.

## 3. Post-deploy verification

1. Visit the service's Render-provided URL (`https://<service>.onrender.com`) → confirm it redirects to `/login` and you can sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
2. Settings → Sync Schedule (or the API Explorer tab) → trigger a manual sync and confirm it completes without errors.
3. Check the service's Render logs for the `[cron] Registered ...` startup lines and the first scheduled run a few minutes later, confirming the always-on instance is actually staying up between requests.
4. Spot-check the Sales page for a known outlet/date to confirm real data is flowing end-to-end.
5. Give Petpooja your service's public Purchase Order webhook URL (during onboarding, or via their support if you're already onboarded):
   ```
   https://ordergenie.bookends.co.in/api/webhooks/petpooja/purchase-order
   ```
   (or the `onrender.com` URL if the custom domain from §4 isn't set up yet) — verified against the same `PETPOOJA_PURCHASE_APP_KEY` / `_APP_SECRET` / `_ACCESS_TOKEN` already set in §2, no separate credential to issue. Until Petpooja has this URL, Purchase Orders still arrive via the 15-minute poller, just not in real time.

## 4. Custom domain — `ordergenie.bookends.co.in`

1. Render Dashboard → your Web Service → **Settings → Custom Domains → Add Custom Domain**.
2. Enter `ordergenie.bookends.co.in`. Render will show you a DNS target — typically a CNAME value like `<your-service>.onrender.com` (Render displays the exact value to use; copy it from there rather than guessing).
3. At `bookends.co.in`'s DNS provider (wherever that domain is registered/managed — not Render), add a **CNAME record**:
   - Host/Name: `ordergenie`
   - Value/Target: the hostname Render gave you in step 2
   - This is a DNS change I can't make for you — it has to happen at your domain registrar/DNS host's dashboard.
4. Back in Render, wait for the domain to show **Verified** (DNS propagation can take anywhere from a few minutes to a few hours). Render auto-provisions a free TLS certificate for the domain once verified — no separate certificate step needed.
5. Once verified, `https://ordergenie.bookends.co.in` serves the same combined service as the `onrender.com` URL — both work, but use the custom domain going forward for the Petpooja webhook URL (§3 step 5) and anywhere else the URL is shared, so it doesn't need to change later.
6. Optional: in Render's Custom Domain settings, you can force redirect the `onrender.com` URL to the custom domain so there's only one canonical URL in practice.

## 5. Data capture from day one

What's automatic once the service is deployed, seeded, and running as an always-on instance — no further action needed:

| Job | Cadence | What it does |
|---|---|---|
| SALES sync | every 5 min | Pulls yesterday's + today's orders |
| INVENTORY sync | every 10 min | Pulls current stock levels |
| PURCHASE sync | every 15 min | Pulls the trailing 7-day PO window |
| HISTORICAL sync | nightly, 2 AM IST | Re-syncs the trailing 7 days for Sales + Purchase, catching late edits (e.g. a bill corrected in Petpooja after its original sync already ran) |
| PO webhook | real-time | Once registered (§3 step 5), new/updated POs land immediately instead of waiting for the next poll |

`prisma/seed.ts` enables all four schedules by default, so nothing needs to be toggled on manually after `db:seed` runs.

**The one hard requirement**: the service must stay running continuously (§2 step 6 — Starter tier or above, not Free). A free instance that spins down between requests silently stops every cron job until the next inbound HTTP request wakes it — data gaps would go unnoticed until someone checks.

**What this does *not* backfill**: `HISTORICAL_SYNC_WINDOW_DAYS` is 7 — the nightly self-heal only covers the trailing week. If you need Sales/Purchase history from *before* deploy day permanently stored in the database (not just viewed live via the read-only Sales API / Purchase Order Explorer tabs, which call Petpooja directly and don't write to the DB), that needs a one-off backfill script looping the existing `runSalesSync` / `runPurchaseSync` services over the older date range. Ask if you want this written — it's a small addition, not a schema or architecture change.

## 6. Ongoing notes

- Because both env files (`backend/.env`, `frontend/.env.local`) and `apidocs/`/`api-curls.md` are gitignored, every credential above must be re-entered by hand in Render — there is nothing to "import" from the repo.
- If Petpooja credentials rotate, update them in Render's dashboard (Environment tab) rather than in any committed file.
- Render's Starter-tier Postgres has storage/connection limits — watch the `Sale`/`Inventory` row counts as more outlets and history accumulate, and upgrade the DB plan before it fills up rather than after.
- Turn on Render's automated Postgres backups (Point-in-Time Recovery, under the database's Backups tab) before go-live — once this is live, the database is the only copy of your Sales/Purchase/Wastage/Reconciliation history; there's no re-import path if it's lost.
