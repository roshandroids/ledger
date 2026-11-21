import { baseTransactions } from './currencies'
import { monthKey, report } from './report'
import type { CategoryRow, State } from './types'

const MAX_CARRY_MONTHS = 120

/** `YYYY-MM` shifted by `n` months (negative goes back). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

/** Estimate the completed month’s budget leftover backed by recorded cash. */
export function unspentToSave(state: State, r = report(state)): number {
  if (
    state.month >= monthKey() ||
    state.transactions.some(
      (t) =>
        t.type === 'Savings transfer' && t.budgetSavingsMonth === state.month,
    )
  )
    return 0
  const available = Math.min(r.planSpend - r.actualSpend, r.actualCash ?? 0)
  return Number.isFinite(available) && available > 0
    ? Math.floor((available + 1e-9) * 100) / 100
    : 0
}

export interface MonthPoint {
  month: string
  /** Actuals are null when the month has no matching transactions. */
  income: number | null
  spend: number | null
  saved: number | null
  rate: number | null
  planSpend: number
  active: boolean
  breakdown: CategoryRow[]
}

/** One report per month, oldest first, ending at `end`. Reuses `report()`, no new math. */
export function monthSeries(
  state: State,
  end: string,
  count: number,
): MonthPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(end, i - count + 1)
    const r = report({ ...state, month })
    return {
      month,
      income: r.actualIncome,
      spend: r.active ? r.actualSpend : null,
      saved: r.active ? r.actualSaved : null,
      rate: r.actualRate,
      planSpend: r.planSpend,
      active: r.active,
      breakdown: r.breakdown,
    }
  })
}

/**
 * Unspent budget carried into `state.month`, by lower-cased category name.
 * Starts at the first month with a valid transaction; overspending never
 * creates a negative carry. Looks back at most 120 months.
 */
export function rolloverCarry(state: State): Map<string, number> {
  const months = state.transactions
    .filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.date) && t.amount !== '')
    .map((t) => t.date.slice(0, 7))
    .sort()
  const first = months[0]
  let carry = new Map<string, number>()
  if (!first || first >= state.month) return carry
  const savedByMonth = new Map<string, number>()
  for (const row of baseTransactions(state)) {
    const month = row.budgetSavingsMonth
    const amount = Number(row.amount)
    if (
      row.type === 'Savings transfer' &&
      month &&
      Number.isFinite(amount) &&
      amount > 0
    ) {
      savedByMonth.set(month, (savedByMonth.get(month) ?? 0) + amount)
    }
  }
  const floor = addMonths(state.month, -MAX_CARRY_MONTHS)
  for (
    let m = first > floor ? first : floor;
    m < state.month;
    m = addMonths(m, 1)
  ) {
    const next = new Map<string, number>()
    const rows = report({ ...state, month: m }).breakdown
    const seen = new Set<string>()
    for (const row of rows) {
      const key = row.name.toLocaleLowerCase('en-CA')
      seen.add(key)
      const left = row.planned + (carry.get(key) ?? 0) - row.actual
      if (left > 0) next.set(key, left)
    }
    for (const [key, value] of carry) if (!seen.has(key)) next.set(key, value)
    // Allocate recorded savings against that month’s category carry once.
    let saved = savedByMonth.get(m) ?? 0
    for (const [key, amount] of next) {
      if (saved <= 0) break
      const used = Math.min(saved, amount)
      if (used === amount) next.delete(key)
      else next.set(key, amount - used)
      saved -= used
    }
    carry = next
  }
  return carry
}
