import { expect, it } from 'vitest'
import { addMonths, monthSeries, rolloverCarry } from './trends'
import { report } from './report'
import { starter } from './starter'
import type { State, Transaction } from './types'

const tx = (date: string, category: string, amount: number): Transaction => ({
  date,
  type: 'Expense',
  category,
  amount,
  goal: '',
  notes: '',
})
const base = (transactions: Transaction[], month: string): State => ({
  ...starter(false),
  month,
  pay: 3000,
  cadence: 'Monthly',
  budget: [
    {
      name: 'Food',
      category: 'Food',
      type: 'Expense',
      cadence: 'Monthly',
      amount: 100,
      due: '',
    },
  ],
  transactions,
})

it('shifts months across year boundaries', () => {
  expect(addMonths('2026-01', -1)).toBe('2025-12')
  expect(addMonths('2026-11', 3)).toBe('2027-02')
  expect(addMonths('2026-05', 0)).toBe('2026-05')
})

it('builds a series that matches report() for each month', () => {
  const s = base(
    [tx('2026-02-03', 'Food', 40), tx('2026-04-01', 'Food', 10)],
    '2026-04',
  )
  const series = monthSeries(s, '2026-04', 3)
  expect(series.map((p) => p.month)).toEqual(['2026-02', '2026-03', '2026-04'])
  series.forEach((p) => {
    const r = report({ ...s, month: p.month })
    expect(p.spend).toBe(r.active ? r.actualSpend : null)
    expect(p.income).toBe(r.actualIncome)
  })
  expect(series[1].spend).toBeNull()
})

it('rolls unspent budget forward and never carries overspend', () => {
  const s = base(
    [tx('2026-01-05', 'Food', 40), tx('2026-02-05', 'Food', 160)],
    '2026-03',
  )
  // Jan: 100-40=60 carries. Feb: 100+60-160=0 carries nothing.
  expect(rolloverCarry({ ...s, month: '2026-02' }).get('food')).toBe(60)
  expect(rolloverCarry(s).get('food')).toBeUndefined()
  // Unused months roll the whole budget: Jan spend 40, Feb none -> 60 + 100.
  const t = base(
    [tx('2026-01-05', 'food', 40), tx('2026-03-01', 'Fun', 1)],
    '2026-03',
  )
  expect(rolloverCarry(t).get('food')).toBe(160)
})

it('has no carry before the first transaction month', () => {
  expect(
    rolloverCarry(base([tx('2026-03-01', 'Food', 1)], '2026-03')).size,
  ).toBe(0)
  expect(rolloverCarry(base([], '2026-03')).size).toBe(0)
})
