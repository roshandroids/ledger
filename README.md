# Ledger

Personal monthly budget planner (CAD). Migrating from the vanilla-JS app in `legacy/`; see `REFACTOR_PLAN.md`.

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
- Deploy `dist/` to any static host. Client-side routes need an SPA fallback: `public/_redirects` covers Netlify and Cloudflare Pages; on Vercel add a rewrite of `/(.*)` to `/index.html`.
