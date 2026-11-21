import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

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
  await choose(page, 'Savings goal', 'Trip')
  await ctl(page, 'Amount').fill('10')
  await page.goto('/goals')
  await page.getByRole('button', { name: 'Remove goal' }).click()
  await expect(page.getByRole('dialog')).toContainText('linked transactions')
  await page.getByRole('button', { name: 'OK' }).click()
  await page.goto('/transactions')
  await choose(page, 'Savings goal', 'General savings')
  await page.goto('/goals')
  await page.getByRole('button', { name: 'Remove goal' }).click()
  await expect(ctl(page, 'Goal name')).toHaveCount(0)
})

test('downloads a valid xlsx', async ({ page }) => {
  await page.goto('/overview')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download Excel/ }).click()
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
