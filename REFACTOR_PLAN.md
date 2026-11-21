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
| Money stored as floats and rounded ad hoc | `model.js` | Integer cents internally, format at the edge. Golden tests must allow for the one intended rounding difference (see risks). |
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

Estimated total: about 12-17 working days for one developer.

## 6. Risks and mitigations

- **Cents rounding changes results slightly.** Legacy rounds only inside gym pricing; everything else is float math. Convert to cents at input and round once per monthly figure, and document the one rule (round half up to the cent). Golden tests compare within 0.005 and any larger difference is investigated, not silently accepted.
- **Excel formulas drift from the domain logic.** Two implementations of the same math. Mitigation: round-trip test comparing cached values to `report()`, and keep formulas simple.
- **Data loss on migration.** Never overwrite the v1 key until v2 is saved and read back; keep the v1 blob under a backup key for one release.
- **Chart library accessibility.** Recharts SVG is not screen-reader friendly by default. Keep the category table and the text summaries as the accessible equivalent.
- **Scope creep (backend, auth, bank import).** Out of scope here; the `Storage` interface is the only hook left for it.

## 7. Out of scope

Backend and accounts, multi-currency, CSV or bank import, recurring-transaction automation, dark mode (add after the port if wanted).

## 8. Open decisions

1. React confirmed, or Svelte instead?
2. Keep Excel formulas live (current behavior, more work) or export values only?
3. Is the `#overview` URL scheme worth keeping, or move to clean paths (`/budget`)?
4. Add a JSON backup/restore (import/export) feature as part of this, since data is only on one device?
