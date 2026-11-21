# Ledger

[![Ledger — monthly budget planner, illustrated with a notebook and spending charts](public/brand/ledger-banner.webp)](https://ledger.rsprojects.dev)

Ledger is a local-first monthly budget planner. It shows what you plan to earn, spend, and save alongside what you actually record.

**[Open Ledger](https://ledger.rsprojects.dev)** · [Set up your first month](#set-up-your-first-month) · [See what’s new](CHANGELOG.md)

Your ledger is saved in the current browser profile. It works offline after an initial online visit and can be installed where the browser supports it. Use a JSON backup to move to another browser or device.

## Set up your first month

<img src="public/brand/monthly-budget.webp" width="200" alt="An open budget notebook with a checkmark and pencil">

1. **Choose a month and start blank.** The sample budget lets you explore the app. Select **Start blank** on the sample banner when you’re ready to enter your own data. The month picker controls which month Overview and the reports show.
2. **Enter your take-home pay.** In **Budget → Pay and monthly target**, enter the amount you receive after deductions **per paycheck**. Choose **Twice monthly** for two paychecks per calendar month or **Biweekly** for a paycheck every 14 days. Ledger averages recurring payments over the year. At $2,487 per paycheck, that’s $4,974.00 twice monthly or $5,388.50 biweekly. Choose the ledger currency and set a monthly savings target.
3. **Build your spending plan.** Add items such as rent, groceries, and fuel with a category, amount, and frequency. Give a **One-time** item its due month. Use the same category for a budget item and its actual transactions so they line up in the category breakdown.
4. **Schedule recurring bills.** On an eligible budget item, select **Make recurring** and pick the first bill date. Ledger moves it to **Recurring bills and income** and keeps it in the plan. The **Include** checkbox controls whether a recurring expense or savings transfer counts toward the plan. Review due dates in Overview and mark a bill paid when you want Ledger to record its transaction. If you already imported the payment, avoid recording it a second time.
5. **Record actuals.** In **Transactions**, enter income and expenses with the date and amount, or import a bank CSV. Review Overview’s **Actual** figures and the income and spending trend as the month progresses.

## Import a bank CSV

<img src="public/brand/transactions.webp" width="175" alt="A receipt and coins in a tray">

Get a CSV export from your bank or card provider, then open **Transactions → Import and export**. Select the file and map the date, description, and either the amount column or separate debit and credit columns. Review each row’s amount, type, category, and account before importing. Ledger flags invalid and previously imported rows in the preview.

Enter transactions that are missing from the CSV separately. Record transfers between your own accounts and credit card payments as **Transfers** in Accounts when you track both sides. Record the card purchases as expenses. This keeps repayments from counting as spending again.

## Review a month and save the difference

- **Overview** compares planned and actual cash flow and lists spending by category and upcoming bills. **Trends** compares months and lets you review a single category over time.
- **Accounts** tracks balances, transfers, net worth, and debt payoff projections. **Savings goals** tracks money earmarked for goals. A savings entry in Ledger does not move funds at your bank.
- For a completed month with an unspent spending budget and positive recorded cash, **Overview → Record as savings** records the available amount in General savings. It caps the amount at the cash left after recorded spending and savings and deducts that amount from any budget carried forward.
- **Download** offers an Excel workbook and a monthly PDF statement for the selected month. The PDF includes a generation timestamp, cash-flow charts, and the category breakdown.

## Back up and personalize Ledger

- In **Settings → Backup and restore**, use **Download backup** for a restorable JSON copy. **Restore from file** replaces the current local ledger. Download a backup first if you want to keep it. Excel and PDF are reports. Use JSON to restore your ledger.
- In **Settings → Appearance**, choose a theme, color palette, font, and interface language. Settings also contains **Install app** when the browser offers installation.
- **App lock** adds a passcode screen. Your browser storage remains readable outside that screen, so use your device’s security controls for protection.
- **Clear cache and start fresh** clears Ledger’s offline cache, local data, and preferences after confirmation. Exported files and Google Drive backups are kept.

## Ledger artwork

<p>
  <img src="public/brand/ledger-logo.png" width="175" alt="Ledger wordmark">
  <img src="public/brand/ledger-launcher-192.png" width="64" alt="Ledger app icon">
</p>

[Browse the brand assets](public/brand) for the wordmark, launcher icon, banner, and illustrations.

## Develop locally

Use Node.js 24 from [`.nvmrc`](.nvmrc).

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

The dev server normally runs at `http://localhost:5173`. The production build is written to `dist/`. Playwright builds and serves a local preview. It uses installed Chrome locally and Chromium in CI.

| Location | Responsibility |
| --- | --- |
| `src/domain` | Budget math, account balances, trends, recurring schedules, and state schema |
| `src/storage`, `src/store` | Browser persistence, migration, JSON backup, and state updates |
| `src/import`, `src/export` | CSV mapping, Excel workbooks, and PDF statements |
| `src/drive` | Optional Google Drive and email integration |
| `src/ui` | Pages, components, appearance preferences, and translations |
| `public/sw.js` | Offline app shell and asset caching |

The local storage adapter migrates the old `ledger-budget-v1` entry to `ledger-budget-v2` and retains the original. Unreadable data is copied to `ledger-budget-corrupt`. The report tests also compare the current budget math against the legacy planner’s golden fixtures.

### Optional Google integration

1. Enable the **Google Drive API** in Google Cloud and configure the OAuth consent screen. Enable the **Gmail API** if you want email delivery.
2. Create a **Web application** OAuth client. Add `http://localhost:5173` and the live site origin under **Authorized JavaScript origins**.
3. For local development, set `VITE_GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com` in `.env.local`. For production, set the same name as a GitHub Actions variable in the `production` environment. For Netlify Deploy Previews, also set it in Netlify and authorize the preview origin if you need to test Google features there.

Drive access is scoped to files created by Ledger. Tokens are kept in memory for the active browser session.

## Production deployments and releases

GitHub Actions owns production deployment. A new production version must have both a version bump and a matching entry in [CHANGELOG.md](CHANGELOG.md).

### One-time setup

1. In Netlify, copy the existing site’s **Project ID** and create a Netlify personal access token with access to that project.
2. In GitHub, open **Settings → Environments → production**. Add environment secrets named `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN`. If Google integration is enabled, set the `VITE_GOOGLE_CLIENT_ID` environment variable described above.
3. Keep the existing Netlify Git connection for Deploy Previews. The checked-in Netlify ignore rule skips ordinary Git-triggered production builds. Use the GitHub workflow for production. Retire any legacy production build hooks or external deployment jobs that bypass it.

See the [Netlify CLI setup guide](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/) for the token and project ID locations.

### Ship a new version

1. Choose a version using [Semantic Versioning](https://semver.org/). Use `npm version patch --no-git-tag-version` for a compatible fix, or substitute `minor` or `major` as appropriate. This updates `package.json` and `package-lock.json` together.
2. Add the newest entry at the top of `CHANGELOG.md` using `## [X.Y.Z] - YYYY-MM-DD` and at least one bullet that describes the user-facing change.
3. Commit the version and changelog with the changes and merge to `main`. Ship one production version at a time. CI runs lint, type checking, unit tests, the build, and browser tests before deployment.
4. Open **Actions → CI → Deploy and publish release**. The job deploys the built site, verifies that the production URL is serving the exact version and commit via `/release.json`, then creates the matching Git tag and GitHub Release from the changelog. A previously released version is skipped.
5. Confirm the release appears in [GitHub Releases](https://github.com/roshandroids/ledger/releases). If the job fails, rerun that workflow while the release commit is still the tip of `main`. If the version is already live, the job can finish publishing its release without uploading it again.

To check a deployed site manually, run:

```bash
SMOKE_URL=https://ledger.rsprojects.dev npx playwright test -c playwright.prod.config.ts
```

For another static host, deploy `dist/` and configure an SPA fallback so direct links such as `/budget` reach `index.html`.
