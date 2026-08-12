# Electron Desktop App for OrderGenie

## Context

OrderGenie currently only runs as a browser tab (Next.js frontend on Render, per `HOSTING.md`). The goal is a native desktop app so staff/admins get a real installed app (dock/taskbar icon, its own window, auto-updates) instead of always opening a browser.

Decisions already confirmed:
- **Platforms**: macOS + Windows.
- **Connectivity**: online-only thin client — the app just points at the already-hosted Render frontend URL, exactly like a browser tab. **No changes to `backend/` or `frontend/` code are needed** — CORS is keyed off the request Origin header, which is identical whether the page loads in a normal browser or an Electron `BrowserWindow`.
- **Packaging**: Electron (not Tauri, not a plain installable PWA), with a native menu, system tray (minimize-to-tray), and `electron-updater` auto-update wired to GitHub Releases (repo: `RITURAJSINGHRAJPUT/ordergenie`, already the git remote).

Caveat: **nothing is deployed to Render yet** (the URLs in `HOSTING.md` are placeholders). The app will default to `http://localhost:3006` in dev; the production URL is a one-line placeholder constant to fill in once real hosting exists, not a blocker to building the wrapper now.

Also flag: this MVP ships **unsigned** builds (no Apple notarization, no Windows code-signing cert — both cost money/require accounts not yet set up). Unsigned means Gatekeeper/SmartScreen warnings on first launch, and mac auto-update may not fully apply the downloaded update until the app is signed. This is an explicit Phase 2, not solved here.

## Approach

New, fully self-contained `desktop/` workspace at the repo root — an Electron shell that does nothing but load a remote URL, with native menu/tray/auto-update chrome around it. Zero changes to `backend/` or existing `frontend/` code.

### 1. Root `package.json`
- Add `"desktop"` to `workspaces`.
- Add `"desktop:dev": "npm run dev -w desktop"` and `"desktop:build": "npm run build -w desktop"`, matching the existing `-w <workspace>` delegation pattern used for backend/frontend.
- Deliberately **not** added to the aggregate `build`/`lint` scripts — Electron packaging is a separate, heavier release lifecycle that Render's build and everyday `npm run build`/`npm run dev` shouldn't have to know about.

### 2. `desktop/` layout
```
desktop/
  package.json          # electron, electron-builder (devDeps); electron-updater (dep)
  tsconfig.json
  electron-builder.yml
  README.md
  PLAN.md                # this file
  src/
    main.ts              # app lifecycle, BrowserWindow, single-instance lock, updater
    config.ts            # resolveAppUrl()
    menu.ts               # Menu.buildFromTemplate
    tray.ts                # Tray + minimize-to-tray
    windowEvents.ts          # external-link handling
  assets/
    icon.svg                 # hand-authored brand SVG, checked in
  scripts/
    generate-icons.mjs        # icon.svg -> build/icon.{icns,ico} + tray PNG
```
No preload script — this is a pure thin client with no IPC/native-API bridging need; default Electron security posture (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`) needs no preload to enforce. Add one later only if a concrete need shows up.

### 3. `config.ts` — `resolveAppUrl()` precedence
1. `process.env.APP_URL` if set (dev override / staging).
2. Else if `app.isPackaged`: `PROD_APP_URL` constant — placeholder `https://ordergenie-frontend.onrender.com`, **update before the first real release tag**.
3. Else (dev, unpackaged): `http://localhost:3006` (matches `frontend/package.json`'s hardcoded dev port).

### 4. `main.ts` behavior
- `app.requestSingleInstanceLock()` — quit second launch, focus existing window instead.
- `BrowserWindow` with explicit `contextIsolation: true, nodeIntegration: false, sandbox: true`, `loadURL(resolveAppUrl())`; a `did-fail-load` retry-after-delay handler (Render free-tier cold starts are already documented in `HOSTING.md`).
- Menu (`menu.ts`): mostly Electron's built-in `role` shorthands — mac `appMenu` (About/Quit) + `editMenu` (needed so Cmd+C/V/A work in login/search fields) + View (Reload/Fullscreen) + `windowMenu`; Windows gets the same roles under a File/Edit/View/Window layout.
- External links (`windowEvents.ts`): `webContents.setWindowOpenHandler` and `will-navigate` — any URL whose origin differs from the app's origin is sent to `shell.openExternal()` instead of opening/navigating inside the app window. Client-side SPA route changes (History API) are untouched — this only intercepts hard navigations/new-window opens.
- Tray (`tray.ts`): context menu (Show, separator, Quit); intercept the window's `close` event to hide instead of quit unless `app.isQuitting` was set (by the tray Quit item / Cmd+Q).
- Auto-update: `if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify()` on `app.whenReady()` — no custom UI for MVP.

### 5. Icon pipeline
- `desktop/assets/icon.svg` (1024×1024): navy `#0f172a` background, centered bold white "OG", sans-serif — exactly matching the existing design in `frontend/src/app/icon.tsx` / `icon-192/route.tsx` / `icon-512/route.tsx` (the only static source asset that needs hand-authoring; everything else is generated).
- `icon-gen` (devDependency, sharp-based, no system ImageMagick needed — installs identically on macOS/Windows CI runners) converts it via `desktop/scripts/generate-icons.mjs` into `desktop/build/icon.icns`, `icon.ico`, and small PNGs (also used as the tray icon source). `desktop/build/` is generated, gitignored, and rebuilt by an explicit `build:icons` script before every package/release.
- Tray PNG ships via `electron-builder.yml`'s `extraResources` (Tray needs a real file at runtime, unlike the mac/win build icons which are only embedded at package time).
- Note: don't mark the tray icon as a macOS "template image" — the solid-color mark would render as a black blob when forced monochrome. Ship it as a plain color icon for MVP; a proper monochrome variant is future polish.

### 6. `electron-builder.yml`
- `appId: com.bookendshospitality.ordergenie` (org name from `README.md`), `productName: OrderGenie`.
- `mac.target: [dmg, zip]` — zip is required by `electron-updater`'s Squirrel.Mac feed, not optional.
- `win.target: nsis` (not `portable` — auto-update needs an installed location to update in place), `oneClick: false`, `perMachine: false` (no admin/UAC needed).
- `publish: { provider: github, owner: RITURAJSINGHRAJPUT, repo: ordergenie }` — this is both the release upload target and the update feed `electron-updater` reads at runtime.

### 7. Release automation — `.github/workflows/desktop-release.yml` (first workflow in the repo)
- Trigger on tag push `desktop-v*`; matrix `[macos-latest, windows-latest]`.
- `permissions: contents: write`; checkout → setup-node (`node-version-file: .nvmrc`) → `npm ci` at repo root (monorepo — must install from root, same reasoning `HOSTING.md` already documents for Render) → `npm run release -w desktop` (`build:icons` + `tsc` + `electron-builder --publish always`), with `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (no PAT needed — publishing to the same repo the workflow runs in).
- Versioning is manual: bump `desktop/package.json`'s `version` to match the `desktop-v<version>` tag before pushing it — that version is what gets embedded into the published update manifest.

### 8. `desktop/README.md`
Covers: what this is (thin wrapper, zero backend/frontend changes), local dev (`npm run desktop:dev`, defaults to `localhost:3006`, override with `APP_URL=...`), the `PROD_APP_URL` placeholder that needs updating before a real release, build/release commands, and the known limitations (unsigned builds → OS warnings + mac auto-update may not fully apply until signed).

## Verification

1. `npm install` at repo root (picks up the new `desktop` workspace).
2. `npm run dev -w frontend` (or root `npm run dev`) to have something running on `localhost:3006`.
3. `npm run desktop:dev` — confirm a native window opens, loads the running frontend, login works (JWT persists via existing `authStore` localStorage — Electron's default session persists across restarts), and that clicking an external link (e.g. any `target=_blank` link) opens the system browser instead of navigating inside the app window.
4. Close the window — confirm it minimizes to the tray instead of quitting; use the tray menu to reopen and to fully Quit.
5. `npm run build:icons -w desktop` then a local unpublished package build (`electron-builder --dir` or platform-specific `dist` script) — confirm the app icon and tray icon look right (visually spot-check the generated PNGs for centering).
6. Push a `desktop-v0.1.0` tag once ready to test the release pipeline end-to-end; confirm the GitHub Release gets created with mac + Windows artifacts, and that a second machine running an older packaged build detects the update via `autoUpdater`.

## Status

Planned, not yet implemented. Nothing under `desktop/` exists except this file.
