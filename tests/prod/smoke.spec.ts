import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

/** Uses only disposable data in a fresh browser context; never touches real ledgers. */
const ctl = (page: Page, label: string) =>
  page.getByLabel(new RegExp('^' + label))

for (const path of ['overview', 'budget', 'transactions']) {
  test(`/${path} opens directly and survives a hard refresh`, async ({
    page,
  }) => {
    const res = await page.goto('/' + path)
    expect(res?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page).toHaveURL(new RegExp(`/${path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}

test('brand images load', async ({ page, isMobile }) => {
  await page.goto('/overview')
  const logo = page.locator(
    isMobile ? 'header img[src*="launcher"]' : 'aside img[src*="logo"]',
  )
  await expect(logo).toBeVisible()
  await expect
    .poll(() => logo.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0)
  for (const f of [
    '/brand/ledger-launcher-192.png',
    '/brand/ledger-favicon.png',
  ])
    expect((await page.request.get(f)).headers()['content-type']).toContain(
      'image/png',
    )
})

test('core workflow: blank, add, edit, filter, month, persist, download', async ({
  page,
}) => {
  await page.goto('/overview')
  await page.getByRole('button', { name: 'Start blank' }).click()

  await page.goto('/transactions')
  await page.getByRole('button', { name: '+ Add transaction' }).click()
  await ctl(page, 'Amount').fill('25')
  await page.getByLabel('Category', { exact: true }).first().fill('Coffee')
  await page.getByRole('button', { name: '+ Add transaction' }).click()
  await page.getByLabel('Category', { exact: true }).last().fill('Rent')
  await page.getByLabel('Amount').last().fill('900')
  // Edit the first row's amount.
  await page.getByLabel('Amount').first().fill('30')
  await expect(page.getByLabel('Amount').first()).toHaveValue('30')

  // Filter, then clear.
  const search = page.getByLabel('Search transactions')
  await search.fill('rent')
  await expect(page.getByText('Showing 1 of 2')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByText('Showing 2 of 2')).toBeVisible()

  // Switch month, switch back.
  await ctl(page, 'Report month').click()
  await page.getByRole('button', { name: 'Previous year' }).click()
  await page.getByRole('button', { name: 'Jun', exact: true }).click()
  await expect(ctl(page, 'Report month')).toContainText('June')

  // Persistence across a reload.
  await page.reload({ waitUntil: 'networkidle' })
  await expect(ctl(page, 'Report month')).toContainText('June')
  const stored = await page.evaluate(() =>
    localStorage.getItem('ledger-budget-v2'),
  )
  expect(JSON.parse(stored ?? '{}').state.transactions).toHaveLength(2)

  // Excel download.
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download Excel/ }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^Ledger-\d{4}-\d{2}\.xlsx$/)
  expect((await readFile(await file.path())).subarray(0, 2).toString()).toBe(
    'PK',
  )
})
