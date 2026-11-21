import { describe, expect, it } from 'vitest'
import {
  billStatus,
  dueInMonth,
  occurrences,
  transactionFor,
} from './recurring'
import { starter } from './starter'
import type { Recurring } from './types'

const rule = (p: Partial<Recurring>): Recurring => ({
  id: 'r1',
  name: 'Rent',
  category: 'Housing',
  type: 'Expense',
  cadence: 'Monthly',
  amount: 100,
  start: '2026-01-31',
  goal: '',
  ...p,
})

describe('occurrences', () => {
  it('clamps month-end days, including leap years', () => {
    expect(occurrences(rule({}), '2026-02')).toEqual(['2026-02-28'])
    expect(occurrences(rule({}), '2028-02')).toEqual(['2028-02-29'])
    expect(occurrences(rule({}), '2026-04')).toEqual(['2026-04-30'])
  })
  it('never fires before the start date', () => {
    expect(occurrences(rule({}), '2025-12')).toEqual([])
    expect(occurrences(rule({ start: '2026-03-20' }), '2026-03')).toEqual([
      '2026-03-20',
    ])
  })
  it('weekly and biweekly count from the start date across months', () => {
    expect(
      occurrences(rule({ cadence: 'Weekly', start: '2026-03-02' }), '2026-03'),
    ).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
      '2026-03-30',
    ])
    expect(
      occurrences(
        rule({ cadence: 'Biweekly', start: '2026-03-02' }),
        '2026-04',
      ),
    ).toEqual(['2026-04-13', '2026-04-27'])
  })
  it('twice monthly uses the start day and the day 15 apart', () => {
    expect(
      occurrences(
        rule({ cadence: 'Twice monthly', start: '2026-01-05' }),
        '2026-02',
      ),
    ).toEqual(['2026-02-05', '2026-02-20'])
    expect(
      occurrences(
        rule({ cadence: 'Twice monthly', start: '2026-01-30' }),
        '2026-02',
      ),
    ).toEqual(['2026-02-15', '2026-02-28'])
  })
  it('quarterly and annual only fire on their months', () => {
    const q = rule({ cadence: 'Quarterly', start: '2026-01-10' })
    expect(occurrences(q, '2026-04')).toEqual(['2026-04-10'])
    expect(occurrences(q, '2026-03')).toEqual([])
    const a = rule({ cadence: 'Annual', start: '2024-02-29' })
    expect(occurrences(a, '2026-02')).toEqual(['2026-02-28'])
    expect(occurrences(a, '2026-03')).toEqual([])
  })
  it('ignores an invalid start date', () => {
    expect(occurrences(rule({ start: '2026-02-30' }), '2026-03')).toEqual([])
    expect(occurrences(rule({ start: '' }), '2026-03')).toEqual([])
  })
})

describe('due and status', () => {
  const state = {
    ...starter(false),
    recurring: [rule({ start: '2026-03-10' })],
  }
  it('marks an occurrence paid once its transaction exists, never twice', () => {
    const [d] = dueInMonth(state, '2026-03')
    expect(d.paid).toBe(false)
    const tx = transactionFor(d.rule, d.date)
    expect(tx).toMatchObject({ notes: 'Rent', ruleId: 'r1', goal: '' })
    const paid = { ...state, transactions: [tx] }
    expect(dueInMonth(paid, '2026-03')[0].paid).toBe(true)
  })
  it('skips rules without a valid amount', () => {
    expect(
      dueInMonth({ ...state, recurring: [rule({ amount: '' })] }, '2026-03'),
    ).toEqual([])
  })
  it('sends savings transfers to the general goal by default', () => {
    expect(
      transactionFor(rule({ type: 'Savings transfer' }), '2026-03-01').goal,
    ).toBe('general')
  })
  it('classifies overdue, soon and upcoming only in the current month', () => {
    const due = (date: string, paid = false) => ({ rule: rule({}), date, paid })
    expect(billStatus(due('2026-03-05'), '2026-03-10', true)).toBe('overdue')
    expect(billStatus(due('2026-03-17'), '2026-03-10', true)).toBe('soon')
    expect(billStatus(due('2026-03-18'), '2026-03-10', true)).toBe('upcoming')
    expect(billStatus(due('2026-03-05', true), '2026-03-10', true)).toBe('paid')
    expect(billStatus(due('2026-03-05'), '2026-03-10', false)).toBe('upcoming')
  })
})
