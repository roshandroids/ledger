import { describe, expect, it } from 'vitest'
import {
  accountBalances,
  accountOf,
  netWorth,
  netWorthSeries,
  payoff,
} from './accounts'
import { report } from './report'
import { starter } from './starter'
import type { Account, State, Transaction, Transfer } from './types'

const acct = (p: Partial<Account>): Account => ({
  id: 'a',
  name: 'Chequing',
  kind: 'Chequing',
  opening: 1000,
  rate: '',
  payment: '',
  ...p,
})
const tx = (p: Partial<Transaction>): Transaction => ({
  date: '2026-03-05',
  type: 'Expense',
  category: '',
  amount: 100,
  goal: '',
  notes: '',
  ...p,
})
const xfer = (p: Partial<Transfer>): Transfer => ({
  id: 't',
  date: '2026-03-10',
  from: 'a',
  to: 'b',
  amount: 300,
  notes: '',
  ...p,
})
const state = (p: Partial<State>): State => ({
  ...starter(false),
  month: '2026-03',
  ...p,
})
const signed = (s: State, month = '2026-03') =>
  Object.fromEntries(
    accountBalances(s, month).map((r) => [r.account.id, r.signed]),
  )

describe('balances', () => {
  const accounts = [
    acct({}),
    acct({ id: 'b', name: 'Savings', kind: 'Savings', opening: 500 }),
    acct({ id: 'c', name: 'Visa', kind: 'Credit card', opening: 200 }),
  ]
  it('applies income, expense and fund expense; ignores goal earmark moves', () => {
    const s = state({
      accounts,
      transactions: [
        tx({ type: 'Income', amount: 2000 }),
        tx({ amount: 50 }),
        tx({ type: 'Fund expense', amount: 25, goal: 'general' }),
        tx({ type: 'Savings transfer', amount: 400, goal: 'general' }),
        tx({ type: 'Savings withdrawal', amount: 10, goal: 'general' }),
      ],
    })
    expect(signed(s).a).toBe(1000 + 2000 - 50 - 25)
  })
  it('unassigned and unknown-account rows belong to the first account', () => {
    const s = state({ accounts, transactions: [tx({ account: 'gone' })] })
    expect(accountOf(s, s.transactions[0])).toBe('a')
    expect(signed(s).a).toBe(900)
    expect(accountOf(state({}), tx({}))).toBeNull()
  })
  it('transfers move money between accounts and never change spending totals', () => {
    const s = state({ accounts, transfers: [xfer({})] })
    expect(signed(s)).toMatchObject({ a: 700, b: 800 })
    expect(netWorth(s, '2026-03').net).toBe(
      netWorth({ ...s, transfers: [] }, '2026-03').net,
    )
    const withTx = state({
      accounts,
      transactions: [tx({})],
      transfers: [xfer({})],
    })
    expect(report(withTx).actualSpend).toBe(
      report({ ...withTx, transfers: [] }).actualSpend,
    )
  })
  it('card spending raises what is owed; paying it from chequing lowers it', () => {
    const s = state({
      accounts,
      transactions: [tx({ account: 'c', amount: 80 })],
      transfers: [xfer({ from: 'a', to: 'c', amount: 100 })],
    })
    const rows = accountBalances(s, '2026-03')
    expect(rows.find((r) => r.account.id === 'c')?.owed).toBe(180) // 200 + 80 - 100
    expect(rows.find((r) => r.account.id === 'a')?.signed).toBe(900)
  })
  it('only counts rows up to the end of the month and skips invalid rows', () => {
    const s = state({
      accounts: [acct({})],
      transactions: [
        tx({ date: '2026-04-01' }),
        tx({ date: 'bad' }),
        tx({ amount: '' }),
      ],
    })
    expect(signed(s, '2026-03').a).toBe(1000)
    expect(signed(s, '2026-04').a).toBe(900)
  })
})

describe('net worth', () => {
  it('is assets minus debts, with a monthly series', () => {
    const s = state({
      accounts: [acct({}), acct({ id: 'c', kind: 'Loan', opening: 400 })],
      transactions: [tx({ date: '2026-02-10', type: 'Income', amount: 100 })],
    })
    expect(netWorth(s, '2026-03')).toEqual({
      assets: 1100,
      liabilities: 400,
      net: 700,
    })
    const series = netWorthSeries(s, '2026-03', 3)
    expect(series.map((p) => p.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ])
    expect(series.map((p) => p.net)).toEqual([600, 700, 700])
  })
})

describe('payoff', () => {
  it('matches a hand-checked loan', () => {
    // 1200 at 12% APR paying 200/month: 1% a month.
    const r = payoff(1200, 12, 200)!
    expect(r.months).toBe(7)
    expect(r.interest).toBe(43.85) // 12 + 10.12 + 8.22 + 6.30 + 4.37 + 2.41 + 0.43
  })
  it('handles zero interest, nothing owed and impossible payments', () => {
    expect(payoff(300, 0, 100)).toEqual({ months: 3, interest: 0 })
    expect(payoff(0, 5, 100)).toEqual({ months: 0, interest: 0 })
    expect(payoff(1000, 24, 20)).toBeNull() // interest is 20/month
    expect(payoff(1000, 5, 0)).toBeNull()
  })
})
