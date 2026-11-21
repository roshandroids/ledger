# Ledger

Personal monthly budget planner (CAD). Local-first React app: data stays in your browser, with Excel export, JSON backup and optional Google Drive saving. No backend.

Stack: Vite, React, TypeScript (strict), Tailwind, Zustand, Zod, Recharts, Motion, exceljs, Vitest, Playwright.

```
src/domain    pure budget math (report, categories, schema)
src/storage   localStorage adapter, v1 -> v2 migration, JSON backup
src/store     Zustand store
src/export    Excel workbook builder
src/drive     Google Drive upload
src/ui        pages, layout, components
```

### Saved data and migration

Data is saved under `ledger-budget-v2`. The old app's `ledger-budget-v1` blob is migrated on first load and left in place as a backup; an unreadable blob is copied to `ledger-budget-corrupt`.

### Golden fixtures

`src/domain/__fixtures__/golden.json` holds `report()` outputs of the original JavaScript implementation for 40 generated budgets; the domain tests assert exact parity. The generator and the original app were removed after the port; they are in git history before the `chore: remove legacy` commit.

```bash
npm install
npm run dev        # dev server
npm test           # unit tests
npm run lint && npm run typecheck && npm run build
```

## Google Drive saving (optional)

Saving to Drive uses Google Identity Services in the browser with the `drive.file` scope (Ledger only sees files it creates). It is off until you set a client ID:

1. In Google Cloud Console, create a project, enable the **Google Drive API**, and configure the OAuth consent screen.
2. Create an **OAuth client ID** of type *Web application*; add your dev (`http://localhost:5173`) and production origins under *Authorized JavaScript origins*.
3. Put it in `.env.local`: `VITE_GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com`.

The first save creates `Ledger-<month>.xlsx` (or the backup JSON) in Drive; later saves update the same file. Tokens are kept in memory only.

## End-to-end tests and deploy

- `npm run e2e` builds, serves a preview and runs Playwright (locally with your installed Chrome; CI installs Chromium). It covers the main flows, the v1 → v2 data migration, the `.xlsx` download and axe accessibility checks on every page (light theme).
- **Netlify:** `netlify.toml` sets the build, SPA fallback, cache and security headers. In Netlify choose *Add new site → Import from Git* → `roshandroids/ledger` (settings are picked up from the file). To enable Drive saving add `VITE_GOOGLE_CLIENT_ID` under *Site configuration → Environment variables*, then add the site's URL to the OAuth client's authorized JavaScript origins.
- Deploy `dist/` to any static host. Client-side routes need an SPA fallback: `public/_redirects` covers Netlify and Cloudflare Pages; on Vercel add a rewrite of `/(.*)` to `/index.html`.
