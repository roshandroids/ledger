# Ledger refactor plan

Goal: move the vanilla-JS app in `dist/` to a typed, tested, component-based web app with animated charts, without changing behavior or losing users' saved data.

## 1. Target stack

| Concern | Choice |
|---|---|
| Build | Vite + React 18 + TypeScript (strict) |
| Routing | React Router (replaces hash routing; keep `#/` URLs working for old bookmarks via redirect) |
| State | Zustand + `persist`-style storage adapter |
| Styling | Tailwind CSS + CSS variables for the existing colour palette |
| Charts | Recharts (bar + donut), visx only if Recharts can't match the current look |
| Animation | Motion (Framer Motion): page transitions, row add/remove, number count-up |
| Excel | `exceljs` (replaces hand-built XML + JSZip) |
| Forms/validation | Zod schemas for state, import and storage migration |
| Tests | Vitest (unit), React Testing Library (components), Playwright (e2e) |
| Quality | ESLint, Prettier, `tsc --noEmit`, GitHub Actions |
| Hosting | Static (Netlify / Vercel / Cloudflare Pages) |

No backend in this refactor. Persistence sits behind an interface so one can be added later.

## 2. Target structure

```
ledger/
  src/
    domain/            pure TS, no React, no DOM
      types.ts         State, BudgetItem, Transaction, Goal, Report
      money.ts         cents helpers, formatting
      frequencies.ts   cadence table
      gym.ts           gym options + monthly average
      report.ts        report(state) -> Report
      starter.ts       sample / blank state
      schema.ts        Zod schemas + version
    storage/
      Storage.ts       interface { load(), save(state) }
      localStorage.ts  implementation + v1 -> v2 migration
    store/
      useLedger.ts     Zustand store + actions
    export/
      workbook.ts      exceljs workbook builder
    ui/
      components/      DataTable, MoneyInput, Select, StatCard, BarRows, DonutChart, Notice, ConfirmDialog
      pages/           Overview, Budget, Transactions, Goals
      layout/          Shell, Sidebar, Topbar
    main.tsx
  tests/e2e/
  legacy/              frozen copy of old dist/ (reference for golden tests, delete at the end)
```

## 3. Behavior that must be preserved (from the current code)

Domain rules, taken from `model.js`:

- Cadence table: Weekly 52, Biweekly 26, Twice monthly 24, Monthly 12, Quarterly 4, Annual 1, One-time 0. Monthly amount = amount x payments / 12.
- One-time items count only when `due === selected month`.
- Gym monthly = `(round2(rate*1.13)*26 + round2(fee*1.13)) / 12`.
- Transaction types: Income, Expense, Savings transfer, Savings withdrawal, Fund expense.
  - Spending = Expense + Fund expense.
  - Goal movement = transfer - withdrawal - fund expense.
- A transaction is valid only with an ISO `YYYY-MM-DD` date and a finite numeric amount. Invalid rows are ignored by calculations.
- Goal balance = opening + net movement of valid rows for that goal dated up to and including the selected month.
- `actualIncome` is `null` unless an Income row exists in the month. Spending and savings actuals are `null` ("-") when the month has no transactions.
- Category grouping is case-insensitive (`en-CA` lowercase), empty means "Uncategorized", sorted by planned desc, then actual desc, then name.
- The gym adds a "Fitness" planned category.
- The `general` goal always exists, cannot be renamed or removed, and a goal with linked transactions cannot be removed.
- Switching a transaction to Income or Expense clears its goal.

UI and storage rules, taken from `app.js`:

- Storage key `ledger-budget-v1`. If storage is unavailable, show a notice to download Excel before closing.
- Number inputs ignore in-progress invalid input (`badInput`, `stepMismatch`, `rangeUnderflow`) rather than saving it.
- Editing any field clears the "Sample budget" banner. "Start blank" resets to an empty budget but keeps the selected month.
- Focus management: after add, focus the new row's first input; after remove, focus the page's Add button; after changing a type or cadence select, keep focus on it.
- Accessibility: aria labels on every input, `aria-current="page"` in the nav, `role="status"` on notices and feedback, `aria-hidden` on decorative chart parts.

## 4. Known issues to fix during the refactor

| Issue | Where | Fix |
|---|---|---|
| Money stored as floats and rounded ad hoc | `model.js` | **Decision (Phase 2):** kept legacy float math for exact parity (golden tests match to 1e-9). Revisit integer cents as a separate, deliberate change. |
| Spreadsheet formulas use hardcoded refs (`B3`, `C10`, `Settings!B7`) | `export.js` | Build refs from a row-index map so reordering can't break them. |
| Column letter via `fromCharCode(65+i)` breaks past column Z | `export.js` | Use exceljs addressing. |
| `alert()` for blocked goal removal | `app.js` | `ConfirmDialog` / inline error. |
| Whole tables re-render on type or cadence change, then focus is restored by DOM query | `app.js` | React keyed rows, controlled inputs. |
| `Date.now()+Math.random()` fallback for goal ids | `app.js` | `crypto.randomUUID()` only (all supported browsers have it). |
| No schema validation of stored JSON | `app.js` | Zod parse on load; fall back to the starter state and keep the raw blob under a backup key if parsing fails. |
| Overview "Savings rate" shows actual rate, hero shows planned | UI copy | Keep as is, but label them clearly. |

## 5. Phases

Each phase ends green (lint, typecheck, tests) and is its own commit or PR.

### Phase 0: Baseline (0.5 day)
- Commit the current `dist/` as the first commit, then move it to `legacy/`.
- Add `.gitignore`, `README.md`, `.nvmrc`.
- Done when the legacy app still opens from `legacy/index.html` and history has the original.

### Phase 1: Scaffold (0.5 day)
- `npm create vite` (React + TS), add Tailwind, ESLint, Prettier, Vitest, `tsc` script.
- GitHub Actions: install, lint, typecheck, test, build.
- Done when CI is green on an empty app.

### Phase 2: Domain port with golden tests (1-2 days)
- Port `model.js` to `src/domain/*` as typed pure functions.
- Before porting, write a script that runs legacy `Ledger.report()` over about 30 generated and hand-picked states and saves the outputs as JSON fixtures.
- Vitest asserts the new `report()` matches the fixtures.
- Cover the rules in section 3 with named tests: each cadence, one-time in and out of month, gym options, invalid transactions, case-insensitive categories, fund expense, goals across months, null actuals.
- Done when all golden and rule tests pass and the domain has no DOM or React imports.

### Phase 3: Storage and store (1 day)
- `Storage` interface and the `localStorage` implementation.
- Zod schema `v2` plus migration from `ledger-budget-v1` (the v1 shape is the current `state`).
- Zustand store with actions: `setSetting`, `addRow`, `updateRow`, `removeRow`, `startBlank`, `setMonth`.
- Tests: migration from a real v1 blob, corrupt JSON, storage throwing, goal-removal guard, type change clears goal.
- Done when the store is fully covered and a v1 blob loads without data loss.

### Phase 4: Shell and shared components (1-2 days)
- Tailwind theme from the existing CSS variables and palette.
- Build `Shell`, `Sidebar`, `Topbar` (month picker, Download button), routes with `#` redirect.
- Build `DataTable`, `MoneyInput`, `Select`, `Notice`, `ConfirmDialog` with the accessibility rules from section 3.
- Done when the layout works at mobile and desktop widths and keyboard navigation reaches every control.

### Phase 5: Pages (3-4 days)
In this order, each with component tests:
1. **Budget**: settings fields, gym radios, budget items table (due-month field only for One-time).
2. **Transactions**: table, category datalist, goal select shown only for goal-related types.
3. **Goals**: table with live balance and progress, general goal locked.
4. **Overview**: hero, stats, cash-flow bars, donut, category comparison.
- Done when a user can do everything the legacy app does, and focus behavior matches section 3.

### Phase 6: Charts and animation (1-2 days)
- Replace CSS bars and the conic-gradient donut with Recharts components (accessible: keep a text/table alternative).
- Motion: count-up on hero and stat numbers, animated bars and arcs, row enter/exit, page transitions.
- Respect `prefers-reduced-motion` (disable all of the above).
- Done when charts match the legacy numbers exactly and animations are off under reduced motion.

### Phase 7: Excel export (1-2 days)
- Rebuild the five sheets (Overview, Settings, Budget, Transactions, Goals) with exceljs, same columns, same formulas, same number formats, frozen header row.
- Generate formulas from a named-reference map, not literals.
- Tests: build a workbook, read it back with exceljs, assert sheets, headers, values and formulas. Compare cached values against `report()`.
- Manual check: open in Excel and in LibreOffice and confirm formulas recalculate to the same numbers.
- Done when the round-trip tests pass and both apps' workbooks agree on a shared sample.

### Phase 8: E2E, polish and deploy (1-2 days)
- Playwright: first load shows sample banner, Start blank, add budget item, add transaction, month switch, add and remove goal (including the blocked case), reload persists, download produces a valid `.xlsx`.
- Run axe checks on each page.
- Lighthouse pass, favicon, meta tags.
- Deploy a preview, then production. Optionally add PWA support.
- Done when e2e is green in CI and the deployed site loads a v1 blob created by the legacy app.

### Phase 9: Cleanup (0.5 day)
- Delete `legacy/` once golden fixtures are committed and the e2e passes.
- Update the README with scripts, structure and the storage migration note.

Estimated total for phases 0-9: about 12-17 working days for one developer.

## 5b. Phase 10: Gaps and improvements

Gap analysis against a typical budget planner, plus unfinished items from phases 0-9. Each phase keeps the rules above: ends green (lint, typecheck, unit, e2e + axe), own commit or PR, no backend. Any change to the stored shape bumps `SCHEMA_VERSION` with a migration and a test that loads the previous version's blob.

### 10.0 Close out the open items (1 day)
Verified 2026-11-21. Production (https://ledger.rsprojects.dev) serves `assets/index-qDGuiTFI.js`, which matches no local build. By feature strings it contains 10.1-10.5 (filters, trends, limits, bills, CSV import) but not 10.6 (accounts), so it is about `d5043ae` (origin/main). Local checks ran on `b4ee594` (local, not pushed), so results marked "local" cover accounts and "prod" results do not.

| Item | Result | Evidence |
|---|---|---|
| Local baseline | Verified (local, `b4ee594`) | `tsc -b`, oxlint, 144 unit tests (1 skipped), `vite build`, 20 Playwright tests incl. axe light and dark on 6 pages all pass |
| Deploy, custom domain, HTTPS | Verified (prod) | Let's Encrypt cert for `ledger.rsprojects.dev`, valid 2026-11-21 to 2027-02-19; HSTS, COOP and nosniff headers present |
| Direct routes and hard refresh | Verified (prod) | `/overview`, `/budget`, `/transactions` open directly and survive reload on desktop (1280x800) and mobile (375x812) |
| Prod smoke test | Verified (prod) | `tests/prod/smoke.spec.ts`: start blank, add and edit transactions, filter and clear, month switch, reload persistence, Excel download (`PK` zip), logo and launcher icon load. 10 of 10 pass. Run with `SMOKE_URL=<url> npx playwright test -c playwright.prod.config.ts` |
| Lighthouse | Verified (prod), all categories at or above 90 | Pages overview, budget, transactions. Desktop: performance 100, accessibility 100, best practices 100, SEO 92. Mobile: performance 91 (overview, LCP 3.4 s), 95 (budget), 100 (transactions); accessibility 100; best practices 100; SEO 92 |
| Lighthouse follow-ups | Open, minor | SEO 92 is `robots.txt` falling through to the SPA fallback; `public/robots.txt` added here, takes effect on the next deploy. Mobile overview LCP is 3.4 s with a 1.2 MB main bundle (370 kB gzip). Tried lazy-loading the Recharts chart components: main bundle fell to 761 kB (243 kB gzip) but local mobile Lighthouse got worse (performance 91 to 86, LCP 3.5 s to 4.2 s, same machine and preview server), so it was reverted. Do not retry without measuring on a compressed deployed build; the chart area appears to be part of the LCP `/favicon.ico` also falls through to HTML (the page links PNG and SVG icons) |
| Drive save and restore round-trip | Open | Not configured in production: the build has no `VITE_GOOGLE_CLIENT_ID`, so the Drive buttons are not rendered. Needs the env var in Netlify, the site URL in the OAuth client's authorized JavaScript origins, and a Google test account. Unit tests cover the upload, restore and 404 paths with a mocked `fetch` |
| LibreOffice recalculation | Open | `soffice` on this Mac is the x86 cask and fails with "Bad CPU type" (no Rosetta). Needs an arm64 LibreOffice or Rosetta, or another machine. The workbook round-trip tests already compare cached values to `report()` |
| Add restore from Drive | Done | Commit `b13ce9e` |


### 10.1 Transaction search, filter, sort (1-2 days)
Status: done. Notes already existed (`notes`), so no schema bump. Amount sort puts invalid rows last; filters are in the URL; adding a row clears filters so the blank row is visible.
- Text search (name, category, note), category, type, goal, date range, amount range; sortable columns.
- Filters live in the URL query string so views are linkable; show "N of M" and a clear-all button.
- Bulk select with delete and re-categorize.
- Add an optional `note` field per transaction (schema v3).
- Done when a 1,000-row ledger filters without visible lag and keyboard use works throughout.

### 10.2 Multi-month history and trends (2-3 days)
Status: done except "copy last month's budget": the budget is not per month (only one-time items carry a `due` month), so there is nothing to copy. Schema is now v3 (`rollover`, default false; v1 and v2 blobs load unchanged). Rollover is shown on Overview only; the Excel export does not include it yet.
- Month-by-month report series from `report()` (no new math): income, spending, net savings, savings rate.
- Trends page: line/bar chart over the last 3, 6 or 12 months; per-category trend; table alternative for a11y.
- "Copy last month's budget" and "Start next month" actions.
- Optional rollover of unspent category budget (setting, off by default). Golden fixtures cover the rollover rule.
- Done when charts match `report()` for each month and rollover is covered by named tests.

### 10.3 Recurring transactions and bills (2-3 days)
Status: done. Schema v4 (`recurring[]`, optional `ruleId` on transactions; v1-v3 blobs load unchanged). Paid is matched by rule id + date, not by name. Bills show on Overview; overdue and due-soon (7 days) only apply while viewing the current calendar month. A generated transaction you delete is re-created by the next generate. Not in the Excel export yet.
- Recurring rule: name, amount, category, type, cadence, next date, optional goal. Schema v3 adds `recurring[]`.
- "Generate this month's transactions" creates dated rows from rules, idempotently (a rule never posts twice for one date).
- Upcoming bills list on Overview with paid/unpaid state (matched to a transaction by name + month) and overdue highlight.
- Optional in-app reminder banner for bills due within N days. No push, since there is no backend.
- Done when generating twice produces no duplicates and a cadence/edge-date test table passes (month ends, leap day).

### 10.4 Per-category limits and alerts (1-2 days)
Status: done, simplified: a category's budget (plus carried-over amount) is its limit, so there is no separate limit field or schema change. Shown on Overview (Limit used column and notice); not repeated on Budget, which edits plans and has no actuals.
- Optional monthly limit per category; progress bar in the category breakdown and on the Budget page.
- Alert states at 80% and 100%, shown as text and icon, not color alone (WCAG).
- Overview notice listing categories over limit.
- Done when thresholds are covered by tests and axe stays clean in light and dark.

### 10.5 CSV and bank import (2-3 days)
Status: done. Fixtures cover three layouts (headerless debit/credit with US dates; headed signed amounts with ISO dates and quoted commas; semicolons with day-first dates and decimal commas). Mapping and keyword rules are remembered in a separate localStorage key (`ledger-import-settings`), so they are not in the JSON backup. Imports go to transactions without an account until 10.6. Duplicate check is date + type + amount + description, counted. CSV export neutralizes formula cells.
- Import CSV with column mapping (date, description, amount or debit/credit), date-format and sign options; the mapping is remembered.
- Preview with per-row validation errors before committing; skip rows that already exist (date + amount + description) to avoid duplicates.
- Rule-based auto-categorize by merchant keywords, editable by the user.
- Export transactions as CSV.
- Parse with a small library or hand-rolled parser; handle quoted fields, BOM, CRLF. All in the browser.
- Done when fixtures from three real bank layouts import correctly and re-importing the same file adds nothing.

### 10.6 Accounts and net worth (3-4 days)
Status: done (committed, not pushed). Schema v5: `accounts[]`, `transfers[]`, optional `account` on transactions; older blobs load unchanged. Rules: Income adds to an account, Expense and Fund expense take from it, goal earmark moves (Savings transfer/withdrawal) leave balances alone, and Transfers move money between accounts and never touch spending totals. Rows with no account use the first account (no data rewrite). Debts store the amount owed; payoff uses fixed payments with monthly interest at rate/12, rounded to cents. Floats kept; balances are rounded to cents at output. Not in the Excel export or the transaction filters yet.
- Accounts: chequing, savings, credit card, loan, investment, with opening balance. Transactions gain an optional `account`; transfers between accounts are paired rows that don't count as spending.
- Net worth card and chart over time; debt payoff view (balance, rate, payment, projected payoff date).
- Schema v3/v4 migration assigns existing rows to a default account.
- Done when balances reconcile to the sum of transactions and transfers never change the spending totals (golden fixtures extended).

### 10.7 Platform polish (2 days)
Status: PWA and currency display done (committed, not pushed); app lock, split transactions and tags deliberately skipped (optional in this plan, no demand yet). PWA: hand-written `public/sw.js` (precaches the build's own files, network-first navigations with the cached shell offline, cache-first assets), update notice with Reload, Install button when the browser offers it; verified offline in Playwright against the production build. Currency: schema v6 `currency` (CAD default, 10 codes), display and Excel formats only, no conversion. Bump `VERSION` in `sw.js` if cached non-hashed files (icons) change. Not yet verified: install prompt on a real device, Lighthouse on a deployed build with the worker.
- PWA: manifest, icons, service worker, offline shell, install prompt.
- Optional multi-currency display (one base currency per ledger, user-selectable symbol and locale); no FX conversion.
- Optional app lock (passcode over a locally encrypted blob) if the user wants privacy on shared devices.
- Split transactions and tags, only if there is demand after 10.1-10.6.
- Done when Lighthouse PWA checks pass and the app loads offline.

### Order and dependencies
10.0 first. Then 10.1, 10.2, 10.4 (small, no new entities), then 10.3, 10.5, 10.6 (schema changes; do one migration per release), then 10.7. 10.5 and 10.6 interact (imports need an account), so 10.6 follows 10.5 and imports target the default account until then.

### Risks
- **Schema churn.** Three schema bumps in a row risk data loss. Mitigation: keep the previous blob under the backup key for one release, test every migration from every earlier version.
- **Float math at scale.** Net worth and payoff projections amplify rounding. Revisit integer cents before 10.6.
- **CSV variety.** Bank formats differ; ship the mapping UI, not hardcoded banks.
- **Service worker caching** can serve stale code; version the cache and show an update prompt.
- **Scope creep** toward a backend. Cross-device sync stays Drive-based.

Estimated total for phase 10: about 14-20 working days.

## 6. Risks and mitigations

- **Cents rounding changes results slightly.** Legacy rounds only inside gym pricing; everything else is float math. Convert to cents at input and round once per monthly figure, and document the one rule (round half up to the cent). Golden tests compare within 0.005 and any larger difference is investigated, not silently accepted.
- **Excel formulas drift from the domain logic.** Two implementations of the same math. Mitigation: round-trip test comparing cached values to `report()`, and keep formulas simple.
- **Data loss on migration.** Never overwrite the v1 key until v2 is saved and read back; keep the v1 blob under a backup key for one release.
- **Chart library accessibility.** Recharts SVG is not screen-reader friendly by default. Keep the category table and the text summaries as the accessible equivalent.
- **Scope creep (backend, auth, bank import).** Out of scope here; the `Storage` interface is the only hook left for it.

## 7. Out of scope

Backend and accounts, multi-currency, CSV or bank import, recurring-transaction automation, dark mode (add after the port if wanted).

## 8. Decisions (resolved)

1. **React**: chosen (animations and charts).
2. **Excel formulas**: kept live, generated from a named-reference map and checked against `report()`.
3. **URLs**: clean paths (`/budget`); old `/#budget` links redirect.
4. **Backup/restore**: added as JSON download and restore, plus optional Google Drive saving (browser-only, no backend).

## 9. Status

Phases 0-9 done and pushed; CI (lint, typecheck, unit, build, e2e with axe in light and dark) is green. Remaining: hosting, a Lighthouse pass, and a LibreOffice recalculation check on a machine where it runs. Two Phase-2 decisions: floats kept (not cents), live Excel formulas kept. Added beyond plan: theming, category icons, JSON backup/restore, Google Drive saving. Phase 10: 10.1-10.6 done (10.6 local, not pushed); 10.0 verified except Drive round-trip and LibreOffice recalculation; 10.7 PWA and currency display done locally (app lock skipped); next is to deploy and verify on a device.
