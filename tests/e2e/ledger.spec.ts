import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { SCHEMA_VERSION, starter, type State } from '../../src/domain'

/** Control by accessible-name prefix (dropdown/picker names end with their current value). */
const ctl = (page: Page, label: string) =>
  page.getByLabel(new RegExp('^' + label))

async function choose(page: Page, label: string, option: string) {
  await ctl(page, label).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test('first load shows the sample banner; Start blank clears it and keeps the month', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/overview$/)
  await expect(page.getByText('Sample budget')).toBeVisible()
  await page.getByRole('button', { name: 'Start blank' }).click()
  await expect(page.getByText('Sample budget')).toBeHidden()
})

test('Overview downloads a monthly PDF statement', async ({
  page,
}, testInfo) => {
  await page.goto('/overview')
  const downloadStarted = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Monthly statement (.pdf)' }).click()
  const download = await downloadStarted
  expect(download.suggestedFilename()).toMatch(
    /^Ledger-Statement-\d{4}-\d{2}\.pdf$/,
  )
  const path = testInfo.outputPath('statement.pdf')
  await download.saveAs(path)
  expect((await readFile(path)).subarray(0, 5).toString()).toBe('%PDF-')
})

test('navigation Settings changes appearance and opens the install prompt', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/overview')
  await page.evaluate(() => {
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: () => {
        document.body.dataset.installPrompted = 'true'
        return Promise.resolve()
      },
    })
    window.dispatchEvent(event)
  })
  await page
    .getByRole('navigation', { name: 'Budget workspace' })
    .getByRole('link', { name: 'Settings' })
    .click()
  await expect(page).toHaveURL(/\/settings$/)
  await page.getByRole('radio', { name: 'Dark' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()
  await page.getByRole('button', { name: 'Install app' }).click()
  await expect(page.locator('body')).toHaveAttribute(
    'data-install-prompted',
    'true',
  )
})

test('appearance preferences and languages apply across pages and survive reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/settings')
  await page.getByRole('radio', { name: 'Ocean' }).check()
  await page.getByLabel('Font', { exact: true }).selectOption('serif')
  await page.getByLabel('Language', { exact: true }).selectOption('fr')
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'ocean')
  await expect(page.locator('body')).toHaveCSS('font-family', /Georgia/)
  await expect(page.getByRole('heading', { name: 'Paramètres' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Océan' })).toBeChecked()
  await expect(page.getByLabel('Police', { exact: true })).toHaveValue('serif')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await page.getByRole('link', { name: 'Aperçu', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Vue mensuelle' }),
  ).toBeVisible()
  await expect(
    page.getByText('Revenu net', { exact: true }).first(),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(360)
  await page.getByRole('link', { name: 'Paramètres', exact: true }).click()
  await page.getByLabel('Langue', { exact: true }).selectOption('es')
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
})

test('Nepali, Japanese and Arabic preferences localize the shell and persist', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/settings')
  await page.getByRole('radio', { name: 'Cobalt' }).check()
  await page.getByLabel('Font', { exact: true }).selectOption('editorial')
  await page.getByLabel('Language', { exact: true }).selectOption('ne')
  await expect(page.getByRole('heading', { name: 'सेटिङहरू' })).toBeVisible()
  await page.getByLabel('भाषा', { exact: true }).selectOption('ja')
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
  await page.getByLabel('言語', { exact: true }).selectOption('ar')
  await expect(page.getByRole('heading', { name: 'الإعدادات' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'cobalt')
  await expect(page.locator('body')).toHaveCSS('font-family', /Palatino/)
  await page.getByRole('link', { name: 'نظرة عامة', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'نظرة عامة شهرية' }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(360)
})

test('Start fresh confirms before clearing Ledger data and offline cache', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.getByRole('radio', { name: 'Dark' }).check()
  await page.evaluate(async () => {
    localStorage.setItem('unrelated-preference', 'keep')
    await caches.open('ledger-reset-test')
    await caches.open('unrelated-cache')
  })
  const reset = page.getByRole('button', {
    name: 'Clear cache and start fresh',
  })
  await reset.click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()
  await reset.click()
  await page.getByRole('button', { name: 'Erase local data' }).click()
  await expect(page).toHaveURL(/overview$/)
  await expect(page.getByText('Sample budget')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')
  const data = await page.evaluate(async () => ({
    caches: await caches.keys(),
    preference: localStorage.getItem('unrelated-preference'),
  }))
  expect(data.caches).not.toContain('ledger-reset-test')
  expect(data.caches).toContain('unrelated-cache')
  expect(data.preference).toBe('keep')
})

test('quick expense previews speech before saving and accepts typed commands', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: class {
        onresult?: (event: { results: { transcript: string }[][] }) => void
        onend?: () => void
        start() {
          setTimeout(() => {
            this.onresult?.({
              results: [[{ transcript: 'log twenty bucks for gas' }]],
            })
            this.onend?.()
          }, 0)
        }
        abort() {}
      },
    })
  })
  await page.goto('/transactions')
  await page.getByRole('button', { name: 'Quick expense' }).click()
  const dialog = page.getByRole('dialog', { name: 'Quick expense' })
  const save = dialog.getByRole('button', { name: 'Save expense' })
  await expect(save).toBeDisabled()
  await dialog.getByRole('button', { name: 'Use microphone' }).click()
  await expect(dialog.getByLabel('Expense amount')).toHaveValue('20')
  await expect(
    dialog.getByLabel('Expense category', { exact: true }),
  ).toHaveValue('Transportation')
  await expect(page.getByRole('table', { name: 'Transactions' })).toHaveCount(0)
  await save.click()
  await expect(
    page.getByRole('table', { name: 'Transactions' }).getByLabel('Notes'),
  ).toHaveValue('gas')
  await page.getByRole('button', { name: 'Quick expense' }).click()
  await dialog.getByLabel('Expense command').fill('log $12.50 for Groceries')
  await dialog.getByRole('button', { name: 'Preview expense' }).click()
  await expect(dialog.getByLabel('Expense amount')).toHaveValue('12.5')
  await expect(
    dialog.getByLabel('Expense category', { exact: true }),
  ).toHaveValue('Groceries')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    page.getByRole('table', { name: 'Transactions' }).getByLabel('Notes'),
  ).toHaveCount(1)
})

test('desktop sidebar can collapse to icons and expand again', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/overview')
  const nav = page.getByRole('navigation', { name: 'Budget workspace' })
  const overview = nav.getByRole('link', { name: 'Overview' })
  const sidebar = page.getByRole('complementary')
  const expandedWidth = (await sidebar.boundingBox())!.width
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(
    page.getByRole('button', { name: 'Expand sidebar' }),
  ).toHaveAttribute('aria-expanded', 'false')
  expect((await sidebar.boundingBox())!.width).toBeLessThan(expandedWidth)
  await expect(overview).toBeVisible()
  await nav.getByRole('link', { name: 'Budget' }).click()
  await expect(page).toHaveURL(/budget$/)
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  expect((await sidebar.boundingBox())!.width).toBe(expandedWidth)
})

test('moving a budget item schedules it and preserves the monthly plan', async ({
  page,
}) => {
  await page.goto('/budget')
  await page
    .getByRole('button', { name: 'Make recurring: Rent & utilities' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Move to recurring bills' })
  await dialog.getByLabel('First bill date').fill('2026-11-15')
  await dialog.getByRole('button', { name: 'Move item' }).click()
  await expect(
    page.getByRole('button', { name: 'Make recurring: Rent & utilities' }),
  ).toHaveCount(0)
  await expect(page.getByLabel('Bill name')).toHaveValue('Rent & utilities')
  await expect(ctl(page, 'Bill start date')).toHaveAccessibleName(
    /Nov 15, 2026/,
  )
  await expect(
    page.getByRole('checkbox', { name: 'Include', exact: true }),
  ).toBeChecked()
  await page.reload()
  await expect(page.getByLabel('Bill name')).toHaveValue('Rent & utilities')
  await page.goto('/overview')
  const housing = page.getByRole('row').filter({ hasText: 'Housing' })
  await expect(housing).toContainText('$1,190.00')
})

test('Overview fits narrow screens and charts recorded income and spending', async ({
  page,
}) => {
  const state: State = {
    ...starter(),
    month: '2026-10',
    transactions: [
      {
        date: '2026-09-04',
        type: 'Income',
        amount: 4000,
        category: '',
        notes: '',
        goal: '',
      },
      {
        date: '2026-09-05',
        type: 'Expense',
        amount: 100,
        category: 'Groceries',
        notes: '',
        goal: '',
      },
      {
        date: '2026-10-04',
        type: 'Income',
        amount: 4500,
        category: '',
        notes: '',
        goal: '',
      },
      {
        date: '2026-10-05',
        type: 'Expense',
        amount: 125,
        category: 'Groceries',
        notes: '',
        goal: '',
      },
    ],
  }
  await page.addInitScript(
    ({ state, version }) => {
      localStorage.setItem(
        'ledger-budget-v2',
        JSON.stringify({ version, state }),
      )
    },
    { state, version: SCHEMA_VERSION },
  )
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/overview')
  const trend = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Income and spending trend' }),
  })
  await expect(trend.locator('.recharts-line-curve')).toHaveCount(2)
  await expect(trend.getByRole('table').getByText('$4,500.00')).toHaveCount(1)
  for (const width of [360, 980, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width)
  }
})

test('category suggestions are compact and searchable and keep custom names', async ({
  page,
}) => {
  await page.goto('/budget')
  await page.getByRole('button', { name: 'Start blank' }).click()
  await page.getByRole('button', { name: '+ Add item' }).click()

  const category = page.getByRole('combobox', { name: 'Category', exact: true })
  await page.getByRole('button', { name: 'Show category suggestions' }).click()
  const list = page.getByRole('listbox')
  await expect(list).toBeVisible()
  expect((await list.boundingBox())!.height).toBeLessThanOrEqual(192)

  await category.fill('bank')
  await expect(list.getByRole('option', { name: 'Bank fees' })).toBeVisible()
  await expect(list.getByRole('option', { name: 'Housing' })).toHaveCount(0)
  await category.press('ArrowDown')
  await category.press('Enter')
  await expect(category).toHaveValue('Bank fees')

  await category.fill('Vehicle upkeep')
  await category.press('Tab')
  await page.reload()
  await expect(category).toHaveValue('Vehicle upkeep')
})

test('budget item, transaction, goal flows persist across reload', async ({
  page,
}) => {
  await page.goto('/budget')
  await page.getByRole('button', { name: 'Start blank' }).click()
  await ctl(page, 'Take-home pay per payment').fill('1000')
  await choose(page, 'Pay frequency', 'Monthly')

  await page.getByRole('button', { name: '+ Add item' }).click()
  await expect(ctl(page, 'Item')).toBeFocused()
  await ctl(page, 'Item').fill('Rent')
  await ctl(page, 'Amount').fill('400')

  await page.goto('/transactions')
  await page.getByRole('button', { name: '+ Add transaction' }).click()
  await ctl(page, 'Amount').fill('25')

  await page.goto('/overview')
  await expect(page.getByTestId('remaining')).toHaveText('$600.00')

  await page.reload()
  await expect(page.getByTestId('remaining')).toHaveText('$600.00')
})

test('month picker switches the report month', async ({ page }) => {
  await page.goto('/overview')
  await ctl(page, 'Report month').click()
  await page.getByRole('button', { name: 'Previous year' }).click()
  await page.getByRole('button', { name: 'Jun', exact: true }).click()
  await expect(ctl(page, 'Report month')).toContainText('June')
  await expect(ctl(page, 'Report month')).toContainText(
    String(new Date().getFullYear() - 1),
  )
})

test('goals: add, block removal when linked, then remove', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: '+ Add goal' }).click()
  await ctl(page, 'Goal name').fill('Trip')
  await page.goto('/transactions')
  await page.getByRole('button', { name: '+ Add transaction' }).click()
  await choose(page, 'Transaction type', 'Savings transfer')
  await choose(page, 'Savings goal,', 'Trip')
  await ctl(page, 'Amount').fill('10')
  await page.goto('/goals')
  await page.getByRole('button', { name: 'Remove goal' }).click()
  await expect(page.getByRole('dialog')).toContainText('linked transactions')
  await page.getByRole('button', { name: 'OK' }).click()
  await page.goto('/transactions')
  await choose(page, 'Savings goal,', 'General savings')
  await page.goto('/goals')
  await page.getByRole('button', { name: 'Remove goal' }).click()
  await expect(ctl(page, 'Goal name')).toHaveCount(0)
})

test('downloads a valid xlsx', async ({ page }) => {
  await page.goto('/overview')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Excel workbook (.xlsx)' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^Ledger-\d{4}-\d{2}\.xlsx$/)
  const bytes = await readFile(await file.path())
  expect(bytes.subarray(0, 2).toString()).toBe('PK')
})

test('loads a blob saved by the legacy app (v1 key)', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ledger-budget-v2')) return
    localStorage.setItem(
      'ledger-budget-v1',
      JSON.stringify({
        sample: false,
        month: '2026-02',
        pay: '3000',
        cadence: 'Monthly',
        target: '',
        gym: 'none',
        budget: [
          {
            name: 'Legacy rent',
            category: 'Housing',
            type: 'Expense',
            cadence: 'Monthly',
            amount: '500',
            due: '',
          },
        ],
        transactions: [],
        goals: [
          { id: 'general', name: 'General savings', target: '', opening: '' },
        ],
      }),
    )
  })
  await page.goto('/budget')
  await expect(ctl(page, 'Item')).toHaveValue('Legacy rent')
  await expect(ctl(page, 'Take-home pay per payment')).toHaveValue('3000')
  await expect(ctl(page, 'Report month')).toContainText('February 2026')
})

test('old #budget bookmarks redirect', async ({ page }) => {
  await page.goto('/#budget')
  await expect(page).toHaveURL(/\/budget$/)
})

for (const scheme of ['light', 'dark'] as const)
  for (const path of [
    'overview',
    'budget',
    'transactions',
    'trends',
    'accounts',
    'goals',
  ]) {
    test(`axe (${scheme}): no serious violations on /${path}`, async ({
      page,
    }) => {
      // Reduced motion avoids measuring contrast mid-fade.
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme })
      // Seed data so filters, charts and the carried-over column are on the page.
      await page.addInitScript(() => {
        const t = (date: string, category: string, amount: number) => ({
          date,
          type: 'Expense',
          category,
          amount,
          goal: '',
          notes: 'n',
        })
        localStorage.setItem(
          'ledger-budget-v2',
          JSON.stringify({
            version: 3,
            state: {
              month: '2026-03',
              pay: 2200,
              rollover: true,
              accounts: [
                { id: 'a', name: 'Main', kind: 'Chequing', opening: 1000 },
                {
                  id: 'c',
                  name: 'Visa',
                  kind: 'Credit card',
                  opening: 600,
                  rate: 19.99,
                  payment: 100,
                },
              ],
              transfers: [
                {
                  id: 't',
                  date: '2026-02-10',
                  from: 'a',
                  to: 'c',
                  amount: 100,
                  notes: '',
                },
              ],
              recurring: [
                {
                  id: 'r1',
                  name: 'Rent',
                  category: 'Housing',
                  type: 'Expense',
                  cadence: 'Monthly',
                  amount: 900,
                  start: '2026-01-01',
                  goal: '',
                },
              ],
              budget: [
                {
                  name: 'Food',
                  category: 'Food',
                  type: 'Expense',
                  cadence: 'Monthly',
                  amount: 300,
                  due: '',
                },
              ],
              transactions: [
                t('2026-01-04', 'Food', 120),
                t('2026-02-04', 'Food', 80),
                t('2026-03-04', 'Fun', 30),
                t('2026-03-05', 'Food', 800),
              ],
            },
          }),
        )
      })
      await page.goto('/' + path)
      await page.getByRole('heading', { level: 1 }).waitFor()
      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(
        violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        ),
      ).toEqual([])
    })
  }

test('imports a bank CSV once and a re-import adds nothing; preview passes axe', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/transactions')
  const csv = Buffer.from(
    'Date,Description,Amount\n2026-03-05,Tim Hortons,-4.50\n2026-03-06,Pay,2000\n',
  )
  const file = { name: 'bank.csv', mimeType: 'text/csv', buffer: csv }
  await page.getByLabel('CSV file').setInputFiles(file)
  await expect(
    page.getByText(/2 ready · 0 already in your ledger/),
  ).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(
    violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
  await page.getByRole('button', { name: 'Import 2 transactions' }).click()
  await expect(page.getByText('Showing 2 of 2')).toBeVisible()
  await page.getByLabel('CSV file').setInputFiles(file)
  await expect(
    page.getByText(/0 ready · 2 already in your ledger/),
  ).toBeVisible()
})

test('works offline after the first visit and installs a service worker', async ({
  page,
  context,
}) => {
  await page.goto('/budget')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // The worker precaches on install and takes control on activate.
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Budget' }),
  ).toBeVisible()
  await page.goto('/transactions')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Transactions' }),
  ).toBeVisible()
  // Lazy chart chunks must be cached too.
  await page.goto('/overview')
  await expect(page.locator('svg.recharts-surface').first()).toBeVisible()
  await context.setOffline(false)
})

test('debt strategies compare snowball and avalanche with an extra payment', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ledger-budget-v2',
      JSON.stringify({
        version: 3,
        state: {
          month: '2026-03',
          accounts: [
            {
              id: 's',
              name: 'Card',
              kind: 'Credit card',
              opening: 500,
              rate: 5,
              payment: 20,
            },
            {
              id: 'b',
              name: 'Loan',
              kind: 'Loan',
              opening: 3000,
              rate: 24,
              payment: 100,
            },
          ],
        },
      }),
    )
  })
  await page.goto('/accounts')
  await ctl(page, 'Extra monthly payment').fill('150')
  const table = page.getByRole('table', { name: 'Payoff strategies' })
  await expect(table.getByRole('row', { name: /Snowball/ })).toContainText(
    'Card → Loan',
  )
  await expect(table.getByRole('row', { name: /Avalanche/ })).toContainText(
    'Loan → Card',
  )
})

test('tags filter the list and a split moves spending between categories', async ({
  page,
}) => {
  await page.goto('/transactions')
  await page
    .getByRole('button', { name: 'Start blank' })
    .click()
    .catch(() => {})
  await page.getByRole('button', { name: '+ Add transaction' }).click()
  await ctl(page, 'Amount').fill('100')
  await page.getByLabel('Category', { exact: true }).fill('Groceries')
  await ctl(page, 'Tags').fill('Trip')
  await ctl(page, 'Notes').click() // blur commits the tags
  await expect(page.getByLabel('Filter by tag')).toBeVisible()
  await page.getByRole('button', { name: 'Split transaction' }).click()
  await ctl(page, 'Split category').fill('Pharmacy')
  await ctl(page, 'Split amount').fill('30')
  await expect(page.getByRole('dialog')).toContainText(
    '$70.00 stays in Groceries',
  )
  await page.getByRole('button', { name: 'Save split' }).click()
  await expect(
    page.getByRole('button', { name: 'Split transaction' }),
  ).toContainText('(1)')
})

test('a USD account needs a rate and converts into net worth', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ledger-budget-v2',
      JSON.stringify({
        version: 3,
        state: {
          month: '2026-03',
          currency: 'CAD',
          accounts: [
            { id: 'c', name: 'Main', kind: 'Chequing', opening: 1000 },
            {
              id: 'u',
              name: 'US',
              kind: 'Savings',
              opening: 200,
              currency: 'USD',
            },
          ],
        },
      }),
    )
  })
  await page.goto('/accounts')
  await expect(
    page.getByText('No rate set: USD is counted 1 to 1.'),
  ).toBeVisible()
  await ctl(page, '1 USD in CAD').fill('1.5')
  await expect(page.getByText('No rate set')).toHaveCount(0)
  // 1000 + 200 * 1.5
  await expect(
    page
      .getByText('Net worth', { exact: true })
      .locator('xpath=following-sibling::strong'),
  ).toHaveText('$1,300.00')
})

test('app lock hides the app after reload until the passcode is entered', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Start blank' }).click()
  await page.getByLabel('New passcode').fill('1234')
  await page.getByLabel('Repeat passcode').fill('1234')
  await page.getByRole('button', { name: 'Turn on lock' }).click()
  await expect(page.getByText('Lock is on.')).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Ledger is locked' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Settings' }),
  ).toHaveCount(0)
  await page.getByLabel('Passcode').fill('9999')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByRole('alert')).toHaveText('Wrong passcode.')
  await page.getByLabel('Passcode').fill('1234')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Settings' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Lock now' }).click()
  await expect(
    page.getByRole('heading', { name: 'Ledger is locked' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Forgot passcode?' }).click()
  await page.getByRole('button', { name: 'Erase everything' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByLabel('New passcode')).toBeVisible() // lock is off again
})
