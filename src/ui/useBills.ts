import { useState } from 'react'
import { billStatus, dueInMonth, monthKey } from '../domain'
import { useLedger } from '../store/useLedger'

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Bills for the selected month with their status. `null` when there are no rules. */
export function useBills() {
  const state = useLedger((s) => s.state)
  // Fixed at mount: a tab left open past midnight refreshes on the next visit.
  const [now] = useState(() => new Date())
  if (state.recurring.length === 0) return null
  const current = state.month === monthKey(now)
  return dueInMonth(state, state.month).map((due) => ({
    due,
    status: billStatus(due, iso(now), current),
  }))
}
