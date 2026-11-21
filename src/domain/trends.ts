import { report } from './report'
import type { CategoryRow, State } from './types'

const MAX_CARRY_MONTHS = 120

/** `YYYY-MM` shifted by `n` months (negative goes back). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
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
    carry = next
  }
  return carry
}
