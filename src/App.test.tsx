import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, it } from 'vitest'
import App from './App'
import { ConfirmDialog } from './ui/components/ConfirmDialog'
import { MoneyInput } from './ui/components/MoneyInput'

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

it('redirects the root to the overview', () => {
  at('/')
  expect(
    screen.getByRole('heading', { level: 1, name: 'Monthly overview' }),
  ).toBeInTheDocument()
})

it('marks the current page in the nav', () => {
  at('/budget')
  expect(screen.getByRole('link', { name: /Budget/ })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(screen.getByRole('link', { name: /Overview/ })).not.toHaveAttribute(
    'aria-current',
  )
})

it('shows the sample banner and Start blank dismisses it', async () => {
  localStorage.clear()
  at('/overview')
  await userEvent.click(screen.getByRole('button', { name: 'Start blank' }))
  expect(screen.queryByRole('button', { name: 'Start blank' })).toBeNull()
})

it('every nav link and the month picker are keyboard reachable', async () => {
  at('/overview')
  await userEvent.tab()
  const seen = new Set<string>()
  for (let i = 0; i < 10; i++) {
    seen.add(
      document.activeElement?.getAttribute('aria-label') ??
        document.activeElement?.textContent ??
        '',
    )
    await userEvent.tab()
  }
  expect([...seen].some((t) => t.startsWith('Report month'))).toBe(true)
  expect([...seen].some((t) => t.includes('Savings goals'))).toBe(true)
})

it('MoneyInput reports valid values', async () => {
  const seen: string[] = []
  render(<MoneyInput label="Pay" value="" onChange={(v) => seen.push(v)} />)
  await userEvent.type(screen.getByLabelText('Pay'), '5')
  expect(seen).toEqual(['5'])
})

it('ConfirmDialog confirms and closes', async () => {
  const calls: string[] = []
  render(
    <ConfirmDialog
      open
      title="Sure?"
      onConfirm={() => calls.push('ok')}
      onClose={() => calls.push('close')}
    >
      body
    </ConfirmDialog>,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirm', hidden: true }),
  )
  expect(calls).toEqual(['ok', 'close'])
})
