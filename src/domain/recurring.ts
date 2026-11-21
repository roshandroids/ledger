import type { Cadence, Recurring, State, Transaction } from './types'

export const recurringCadences: Recurring['cadence'][] = [
  'Weekly',
  'Biweekly',
  'Twice monthly',
  'Monthly',
  'Quarterly',
  'Annual',
]
export const recurringTypes: Recurring['type'][] = [
  'Income',
  'Expense',
  'Savings transfer',
]

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (n: number) => String(n).padStart(2, '0')
const dayNumber = (y: number, m: number, d: number) =>
  Math.round(Date.UTC(y, m - 1, d) / 86_400_000)

/** Dates the rule falls on in `month` (`YYYY-MM`), never before its start date. */
export function occurrences(rule: Recurring, month: string): string[] {
  const s = ISO.exec(rule.start)
  const mm = /^(\d{4})-(\d{2})$/.exec(month)
  if (!s || !mm) return []
  const [sy, sm, sd] = [+s[1], +s[2], +s[3]]
  const real = new Date(sy, sm - 1, sd)
  if (real.getMonth() !== sm - 1 || real.getDate() !== sd) return []
  const [y, m] = [+mm[1], +mm[2]]
  const dim = new Date(y, m, 0).getDate()
  const monthsApart = (y - sy) * 12 + (m - sm)
  const days: number[] = []
  const cadence: Cadence = rule.cadence
  if (cadence === 'Weekly' || cadence === 'Biweekly') {
    const step = cadence === 'Weekly' ? 7 : 14
    for (let d = 1; d <= dim; d++) {
      const n = dayNumber(y, m, d) - dayNumber(sy, sm, sd)
      if (n >= 0 && n % step === 0) days.push(d)
    }
  } else if (monthsApart >= 0) {
    if (cadence === 'Twice monthly')
      days.push(...(sd <= 15 ? [sd, sd + 15] : [sd - 15, sd]))
    else if (
      cadence === 'Monthly' ||
      (cadence === 'Quarterly' && monthsApart % 3 === 0) ||
      (cadence === 'Annual' && monthsApart % 12 === 0)
    )
      days.push(sd)
  }
  return [...new Set(days.map((d) => Math.min(d, dim)))]
    .map((d) => `${month}-${pad(d)}`)
    .filter((date) => date >= rule.start)
}

const hasAmount = (r: Recurring) =>
  r.amount !== '' && Number.isFinite(Number(r.amount))

export interface Due {
  rule: Recurring
  date: string
  paid: boolean
}

/** Every occurrence in `month`, oldest first, with whether a matching transaction exists. */
export function dueInMonth(state: State, month: string): Due[] {
  return state.recurring
    .filter(hasAmount)
    .flatMap((rule) =>
      occurrences(rule, month).map((date) => ({
        rule,
        date,
        paid: state.transactions.some(
          (t) => t.ruleId === rule.id && t.date === date,
        ),
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function transactionFor(rule: Recurring, date: string): Transaction {
  return {
    date,
    type: rule.type,
    category: rule.category,
    amount: rule.amount,
    goal: rule.type === 'Savings transfer' ? rule.goal || 'general' : '',
    notes: rule.name,
    ruleId: rule.id,
  }
}

export type BillStatus = 'paid' | 'overdue' | 'soon' | 'upcoming'
export const SOON_DAYS = 7

/** Overdue and due-soon only apply while viewing the current calendar month. */
export function billStatus(
  due: Due,
  today: string,
  viewingCurrentMonth: boolean,
): BillStatus {
  if (due.paid) return 'paid'
  if (!viewingCurrentMonth) return 'upcoming'
  if (due.date < today) return 'overdue'
  const [y, m, d] = today.split('-').map(Number)
  const limit = new Date(y, m - 1, d + SOON_DAYS)
  const iso = `${limit.getFullYear()}-${pad(limit.getMonth() + 1)}-${pad(limit.getDate())}`
  return due.date <= iso ? 'soon' : 'upcoming'
}
