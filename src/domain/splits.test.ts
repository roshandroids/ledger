import { describe, expect, it } from 'vitest'
import { parseState, report, splitParts, starter } from './index'
import type { State, Transaction } from './types'

const tx = (p: Partial<Transaction>): Transaction => ({
  date: '2026-03-05',
  type: 'Expense',
  category: 'Groceries',
  amount: 100,
  goal: '',
  notes: '',
  ...p,
})
const actual = (s: State) =>
  Object.fromEntries(report(s).breakdown.map((r) => [r.name, r.actual]))

describe('splits', () => {
  it('files splits under their categories and the remainder under the row category', () => {
    expect(
      splitParts(tx({ splits: [{ category: 'Pharmacy', amount: 30 }] })),
    ).toEqual([
      { category: 'Pharmacy', amount: 30 },
      { category: 'Groceries', amount: 70 },
    ])
  })
  it('ignores splits that exceed the amount or are empty', () => {
    const whole = [{ category: 'Groceries', amount: 100 }]
    expect(
      splitParts(tx({ splits: [{ category: 'X', amount: 150 }] })),
    ).toEqual(whole)
    expect(splitParts(tx({ splits: [{ category: 'X', amount: '' }] }))).toEqual(
      whole,
    )
  })
  it('moves category totals but never total spending', () => {
    const s = { ...starter(), month: '2026-03', budget: [] } as State
    s.transactions = [tx({ splits: [{ category: 'pharmacy', amount: 30 }] })]
    expect(actual(s)).toEqual({ pharmacy: 30, Groceries: 70 })
    expect(report(s).actualSpend).toBe(100)
  })
  it('loads older blobs without tags or splits and keeps them when present', () => {
    expect(
      parseState({ ...starter(), transactions: [tx({})] })?.transactions[0]
        .tags,
    ).toBeUndefined()
    const kept = parseState({
      ...starter(),
      transactions: [
        tx({ tags: ['trip'], splits: [{ category: 'A', amount: 5 }] }),
      ],
    })!.transactions[0]
    expect(kept.tags).toEqual(['trip'])
    expect(kept.splits).toEqual([{ category: 'A', amount: 5 }])
  })
})
