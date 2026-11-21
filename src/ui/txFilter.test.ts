import { expect, it } from 'vitest'
import type { Transaction } from '../domain'
import {
  emptyFilter,
  filterTransactions,
  isFiltered,
  NONE,
  parseFilter,
  toParams,
} from './txFilter'

const t = (p: Partial<Transaction>): Transaction => ({
  date: '2026-03-01',
  type: 'Expense',
  category: 'Food',
  amount: 10,
  goal: '',
  notes: '',
  ...p,
})
const txs = [
  t({ date: '2026-03-05', amount: 50, category: 'food', notes: 'Pizza' }),
  t({ date: '2026-03-01', amount: 5, category: 'Fun' }),
  t({ type: 'Income', date: '2026-03-10', amount: 900, category: '' }),
  t({ date: 'bad', amount: '' }),
]
const run = (f: Partial<typeof emptyFilter>) =>
  filterTransactions(txs, { ...emptyFilter, ...f }).map((r) => r.index)

it('keeps entry order and original indexes by default', () => {
  expect(run({})).toEqual([0, 1, 2, 3])
})
it('filters by text across category and notes, case-insensitively', () => {
  expect(run({ q: 'PIZ' })).toEqual([0])
  expect(run({ q: 'food' })).toEqual([0, 3])
})
it('filters by type, category (case-insensitive) and uncategorized', () => {
  expect(run({ type: 'Income' })).toEqual([2])
  expect(run({ category: 'FOOD' })).toEqual([0, 3])
  expect(run({ category: NONE })).toEqual([2])
})
it('filters by inclusive date and amount ranges; invalid rows drop out', () => {
  expect(run({ from: '2026-03-05', to: '2026-03-10' })).toEqual([0, 2])
  expect(run({ min: '10', max: '50' })).toEqual([0])
  expect(run({ min: '0' })).toEqual([0, 1, 2])
})
it('sorts with invalid values last', () => {
  expect(run({ sort: 'date-asc' })).toEqual([1, 0, 2, 3])
  expect(run({ sort: 'amount-desc' })).toEqual([2, 0, 1, 3])
  expect(run({ sort: 'amount-asc' })).toEqual([1, 0, 2, 3])
})
it('round-trips through URL params and reports when filtered', () => {
  const f = { ...emptyFilter, q: 'a', sort: 'amount-asc' as const }
  expect(parseFilter(toParams(f))).toEqual(f)
  expect(toParams(emptyFilter).toString()).toBe('')
  expect(isFiltered(f)).toBe(true)
  expect(isFiltered({ ...emptyFilter, sort: 'category' })).toBe(false)
})

it('filters by account, resolving unassigned rows through the resolver', () => {
  const rows = [t({ account: 'b' }), t({}), t({ account: 'a' })]
  const run2 = (account: string) =>
    filterTransactions(
      rows,
      { ...emptyFilter, account },
      (x) => x.account || 'a',
    ).map((r) => r.index)
  expect(run2('a')).toEqual([1, 2])
  expect(run2('b')).toEqual([0])
  expect(isFiltered({ ...emptyFilter, account: 'a' })).toBe(true)
})

it('filters by tag case-insensitively and searches tags', () => {
  const rows = [t({ tags: ['Trip'] }), t({}), t({ tags: ['work', 'trip'] })]
  const idx = (f: Partial<typeof emptyFilter>) =>
    filterTransactions(rows, { ...emptyFilter, ...f }).map((r) => r.index)
  expect(idx({ tag: 'trip' })).toEqual([0, 2])
  expect(idx({ q: 'work' })).toEqual([2])
})
