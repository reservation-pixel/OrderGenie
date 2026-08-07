# Hosting OrderGenie on Render

This guide deploys all three pieces the PRD calls for — PostgreSQL, the Express backend, and the Next.js frontend — to [Render](https://render.com). No Redis/BullMQ/RabbitMQ is used; scheduled Petpooja syncs run via `node-cron` inside the backend process.

## 0. Prerequisites

- A Render account.
- Code pushed to `https://github.com/RITURAJSINGHRAJPUT/ordergenie.git` (the remote is already configured locally — commit and push before starting).
- Your real Petpooja credentials (Sales + Purchase app keys/secrets/tokens) — the same values from your local `backend/.env`. `apidocs/`, `api-curls.md`, and all `.env*` files are gitignored, so nothing secret has been pushed; you'll re-enter these directly into Render's dashboard.

## 1. PostgreSQL

1. Render Dashboard → **New → PostgreSQL**.
2. Name it (e.g. `ordergenie-db`), choose a region close to your backend service (pick the same region for both — cross-region adds latency), and a plan (Free is fine to start, but see the note in §5 about instance sizing for the always-on backend).
3. Once created, copy the **Internal Database URL** (not the external one — the internal URL is faster and free, and works because the backend will live in the same Render region/network).

## 2. Backend — Web Service

Render **Web Service**, not a Static Site (needs a long-running Node process for `node-cron` and Express).

1. Render Dashboard → **New → Web Service** → connect the `ordergenie` GitHub repo.
2. **Root Directory**: leave blank (repo root) — this is an npm-workspaces monorepo, so `npm install` must run from the root to correctly hoist/link shared `node_modules`.
3. **Build Command**:
   ```
   npm install && npm run build -w backend
   ```
4. **Start Command**:
   ```
   npm run start -w backend
   ```
5. **Environment Variables** (Render dashboard → Environment), matching `backend/.env.example`:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Internal Database URL from step 1 |
   | `PORT` | *(leave unset — Render injects this automatically; `env.ts` already reads `process.env.PORT`)* |
   | `CORS_ORIGIN` | Your frontend's Render URL, e.g. `https://ordergenie-frontend.onrender.com` (set after step 3, then redeploy) |
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

   `npm run build -w backend` runs `tsc`; a `postinstall: "prisma generate"` script was just added to `backend/package.json` so `npm install` always regenerates the Prisma Client on Render's clean checkout (it previously only worked locally because migrations had already been run once). `schema.prisma` already declares `binaryTargets = ["native", "debian-openssl-3.0.x"]`, which matches Render's Linux runtime.

6. **Instance Type**: pick at least **Starter** (paid), not Free. Render's free web services spin down after 15 minutes of inactivity — this backend relies on in-process `node-cron` jobs (SALES every 5 min, INVENTORY every 10 min, PURCHASE every 15 min, HISTORICAL nightly) that only run while the process is alive. A spun-down free instance would silently stop syncing until the next inbound HTTP request woke it up.
7. Deploy. After the first successful deploy, open the service's **Shell** tab and run the schema + seed once:
   ```
   npm run db:migrate:deploy -w backend
   npm run db:seed -w backend
   ```
   `db:migrate:deploy` (just added, runs `prisma migrate deploy`) only applies already-committed migrations non-interactively — safe for production. The existing `db:migrate` script runs `prisma migrate dev`, which is interactive and can generate new migrations; never run that one against production.
8. Once `CORS_ORIGIN` needs the frontend's real URL (step 3), come back and update that env var, which triggers an automatic redeploy.

## 3. Frontend — Web Service

Also a Render **Web Service** (not a Static Site) — the app uses dynamic route handlers for the PWA manifest/icons (`manifest.ts`, `icon-192/route.tsx`, etc.), so it isn't a pure static export.

1. Render Dashboard → **New → Web Service** → same `ordergenie` repo.
2. **Root Directory**: blank (repo root), same monorepo reasoning as the backend.
3. **Build Command**:
   ```
   npm install && npm run build -w frontend
   ```
4. **Start Command** — override the package.json default here rather than editing it, since `frontend/package.json`'s `start` script hardcodes `-p 3006` for local dev:
   ```
   npm run start -w frontend -- -p $PORT
   ```
   (Render injects its own `PORT`; the app must bind to it rather than a fixed port.)
5. **Environment Variables**:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Your backend's Render URL + `/api`, e.g. `https://ordergenie-backend.onrender.com/api` |

6. Instance type: Free is workable here since the frontend has no background jobs — just note the usual free-tier cold-start delay on the first request after idling. Upgrade to Starter if that's noticeable for real users.
7. Deploy, then go back to the backend service and set `CORS_ORIGIN` to this frontend's URL (§2 step 8).

## 4. Post-deploy verification

1. Visit the frontend URL → log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
2. Settings → Sync Schedule (or the API Explorer tab) → trigger a manual sync and confirm it completes without CORS or auth errors.
3. Check the backend's Render logs for the `node-cron` startup lines and the first scheduled run a few minutes later, confirming the always-on instance is actually staying up between requests.
4. Spot-check the Sales page for a known outlet/date to confirm real data is flowing end-to-end.

## 5. Ongoing notes

- Because both env files (`backend/.env`, `frontend/.env.local`) and `apidocs/`/`api-curls.md` are gitignored, every credential above must be re-entered by hand in Render — there is nothing to "import" from the repo.
- If Petpooja credentials rotate, update them in Render's dashboard (Environment tab) rather than in any committed file.
- Render's Starter-tier Postgres has storage/connection limits — watch the `Sale`/`Inventory` row counts as more outlets and history accumulate, and upgrade the DB plan before it fills up rather than after.
