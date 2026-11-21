import { addMonths } from './trends'
import type { Account, AccountKind, State, Transaction } from './types'

export const accountKinds: AccountKind[] = [
  'Chequing',
  'Savings',
  'Investment',
  'Credit card',
  'Loan',
]
export const isDebt = (a: Pick<Account, 'kind'>) =>
  a.kind === 'Credit card' || a.kind === 'Loan'

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const num = (v: unknown) => (v === '' ? NaN : Number(v))
const validTx = (t: Transaction) =>
  /^\d{4}-\d{2}-\d{2}$/.test(t.date) && Number.isFinite(num(t.amount))

/**
 * Income adds to an account; Expense and Fund expense take from it. Savings
 * transfers and withdrawals only move earmarks between goals, so they leave
 * account balances alone: move real money with a Transfer.
 */
const effect = (t: Transaction) =>
  t.type === 'Income'
    ? num(t.amount)
    : t.type === 'Expense' || t.type === 'Fund expense'
      ? -num(t.amount)
      : 0

/** Account a transaction belongs to; unassigned or unknown ids use the first account. */
export function accountOf(state: State, t: Transaction): string | null {
  const known = state.accounts.some((a) => a.id === t.account)
  return known ? (t.account as string) : (state.accounts[0]?.id ?? null)
}

export interface AccountBalance {
  account: Account
  /** Positive is money you have, negative is money you owe. */
  signed: number
  /** Amount owed for debts, otherwise null. */
  owed: number | null
}

/** Balances at the end of `month`. Debts start at minus the amount owed. */
export function accountBalances(state: State, month: string): AccountBalance[] {
  const end = month + '-31'
  const signed = new Map(
    state.accounts.map((a) => [
      a.id,
      (isDebt(a) ? -1 : 1) * (num(a.opening) || 0),
    ]),
  )
  for (const t of state.transactions) {
    if (!validTx(t) || t.date > end) continue
    const id = accountOf(state, t)
    if (id) signed.set(id, (signed.get(id) ?? 0) + effect(t))
  }
  for (const x of state.transfers) {
    const amount = num(x.amount)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(x.date) ||
      !Number.isFinite(amount) ||
      x.date > end
    )
      continue
    if (signed.has(x.from)) signed.set(x.from, signed.get(x.from)! - amount)
    if (signed.has(x.to)) signed.set(x.to, signed.get(x.to)! + amount)
  }
  return state.accounts.map((account) => {
    const value = round2(signed.get(account.id) ?? 0)
    return { account, signed: value, owed: isDebt(account) ? -value : null }
  })
}

export function netWorth(state: State, month: string) {
  const rows = accountBalances(state, month)
  const assets = round2(
    rows.filter((r) => r.owed === null).reduce((s, r) => s + r.signed, 0),
  )
  const liabilities = round2(
    rows.filter((r) => r.owed !== null).reduce((s, r) => s + (r.owed ?? 0), 0),
  )
  return { assets, liabilities, net: round2(assets - liabilities) }
}

/** Net worth at the end of each of the last `count` months, oldest first. */
export function netWorthSeries(state: State, end: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(end, i - count + 1)
    return { month, ...netWorth(state, month) }
  })
}

const MAX_MONTHS = 1200

/**
 * Months and interest to clear a debt with a fixed monthly payment, interest
 * charged monthly at rate/12. `null` when the payment never covers the interest.
 */
export function payoff(
  owed: number,
  aprPercent: number,
  payment: number,
): { months: number; interest: number } | null {
  if (!(owed > 0)) return { months: 0, interest: 0 }
  if (!(payment > 0)) return null
  let balance = owed
  let interest = 0
  for (let months = 1; months <= MAX_MONTHS; months++) {
    const charge = round2((balance * (aprPercent || 0)) / 1200)
    if (payment <= charge) return null
    interest = round2(interest + charge)
    balance = round2(balance + charge - payment)
    if (balance <= 0) return { months, interest }
  }
  return null
}
