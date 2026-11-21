import { describe, expect, it } from 'vitest'
import golden from './__fixtures__/golden.json'
import { gymMonthly, gymOptions, monthly, report, starter } from './index'
import type { State } from './types'

const plain = (value: unknown) => JSON.parse(JSON.stringify(value))

function expectClose(actual: unknown, expected: unknown, path: string) {
  if (typeof expected === 'number') {
    expect(typeof actual, path).toBe('number')
    expect(Math.abs((actual as number) - expected), path).toBeLessThan(1e-9)
  } else if (Array.isArray(expected)) {
    expect((actual as unknown[]).length, path).toBe(expected.length)
    expected.forEach((item, i) =>
      expectClose((actual as unknown[])[i], item, `${path}[${i}]`),
    )
  } else if (expected && typeof expected === 'object') {
    const keys = Object.keys(expected)
    expect(Object.keys(actual as object).sort(), path).toEqual(keys.sort())
    keys.forEach((key) =>
      expectClose(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        `${path}.${key}`,
      ),
    )
  } else {
    expect(actual, path).toEqual(expected)
  }
}

describe('report() matches legacy model.js', () => {
  golden.forEach(({ state, report: expected }, i) => {
    it(`golden case ${i}`, () => {
      expectClose(plain(report(state as unknown as State)), expected, 'report')
    })
  })
})

const base = (patch: Partial<State> = {}): State => ({
  ...starter(false),
  month: '2026-03',
  ...patch,
})

describe('rules', () => {
  it('averages cadences to monthly', () => {
    expect(monthly(100, 'Weekly', '', '2026-03')).toBeCloseTo((100 * 52) / 12)
    expect(monthly(100, 'Quarterly', '', '2026-03')).toBeCloseTo(100 / 3)
  })
  it('counts one-time only in its due month', () => {
    expect(monthly(500, 'One-time', '2026-03', '2026-03')).toBe(500)
    expect(monthly(500, 'One-time', '2026-04', '2026-03')).toBe(0)
  })
  it('computes gym average with HST', () => {
    expect(gymMonthly(gymOptions[0])).toBe(0)
    expect(gymMonthly(gymOptions[2])).toBeCloseTo((34.74 * 26) / 12, 2)
  })
  it('ignores invalid transactions', () => {
    const r = report(
      base({
        transactions: [
          {
            date: '2026-03-01',
            type: 'Expense',
            category: 'A',
            amount: 'abc',
            goal: '',
            notes: '',
          },
          {
            date: '2026-3-1',
            type: 'Expense',
            category: 'A',
            amount: '5',
            goal: '',
            notes: '',
          },
        ],
      }),
    )
    expect(r.active).toBe(false)
  })
  it('fund expense is spending and reduces the goal', () => {
    const r = report(
      base({
        transactions: [
          {
            date: '2026-03-02',
            type: 'Savings transfer',
            category: '',
            amount: '100',
            goal: 'general',
            notes: '',
          },
          {
            date: '2026-03-03',
            type: 'Fund expense',
            category: 'Car',
            amount: '30',
            goal: 'general',
            notes: '',
          },
        ],
      }),
    )
    expect(r.actualSpend).toBe(30)
    expect(r.goalRows[0].balance).toBe(70)
  })
  it('groups categories case-insensitively', () => {
    const r = report(
      base({
        transactions: [
          {
            date: '2026-03-02',
            type: 'Expense',
            category: 'Food',
            amount: '10',
            goal: '',
            notes: '',
          },
          {
            date: '2026-03-03',
            type: 'Expense',
            category: ' food ',
            amount: '5',
            goal: '',
            notes: '',
          },
        ],
      }),
    )
    expect(r.breakdown).toEqual([{ name: 'Food', planned: 0, actual: 15 }])
  })
  it('leaves actual income null without Income rows', () => {
    expect(report(base()).actualIncome).toBeNull()
  })
})
