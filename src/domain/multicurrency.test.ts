import { describe, expect, it } from 'vitest'
import {
  accountBalances,
  baseTransactions,
  netWorth,
  parseState,
  rateFor,
  report,
  starter,
} from './index'
import type { State, Transaction } from './types'

const tx = (p: Partial<Transaction>): Transaction => ({
  date: '2026-03-05',
  type: 'Expense',
  category: 'Food',
  amount: 10,
  goal: '',
  notes: '',
  ...p,
})
const base = (): State => ({
  ...starter(),
  month: '2026-03',
  budget: [],
  currency: 'CAD',
  rates: { USD: 1.5 },
  accounts: [
    {
      id: 'c',
      name: 'CAD',
      kind: 'Chequing',
      opening: 1000,
      rate: '',
      payment: '',
    },
    {
      id: 'u',
      name: 'USD',
      kind: 'Savings',
      opening: 200,
      rate: '',
      payment: '',
      currency: 'USD',
    },
  ],
  transfers: [],
  transactions: [],
})

describe('per-account currency', () => {
  it('uses 1 for the ledger currency and for a missing rate', () => {
    const s = base()
    expect(rateFor(s, 'CAD')).toBe(1)
    expect(rateFor(s, 'USD')).toBe(1.5)
    expect(rateFor(s, 'EUR')).toBe(1)
    expect(rateFor(s, undefined)).toBe(1)
  })
  it('converts foreign-account transactions in reports, splits included', () => {
    const s = base()
    s.transactions = [
      tx({
        account: 'u',
        amount: 10,
        splits: [{ category: 'Fun', amount: 4 }],
      }),
      tx({ amount: 10 }),
    ]
    expect(report(s).actualSpend).toBe(25) // 10 * 1.5 + 10
    const rows = Object.fromEntries(
      report(s).breakdown.map((r) => [r.name, r.actual]),
    )
    expect(rows).toEqual({ Fun: 6, Food: 19 })
    expect(s.transactions[0].amount).toBe(10) // input untouched
  })
  it('leaves everything alone with no foreign account', () => {
    const s = base()
    s.accounts[1].currency = undefined
    s.transactions = [tx({ account: 'u' })]
    expect(baseTransactions(s)).toBe(s.transactions)
  })
  it('keeps balances in their own currency and converts net worth', () => {
    const s = base()
    s.transactions = [tx({ account: 'u', type: 'Income', amount: 100 })]
    const b = accountBalances(s, '2026-03')
    expect(b.map((x) => [x.currency, x.signed])).toEqual([
      ['CAD', 1000],
      ['USD', 300],
    ])
    expect(netWorth(s, '2026-03').assets).toBe(1450)
  })
  it('converts transfers between currencies', () => {
    const s = base()
    s.transfers = [
      {
        id: 't',
        date: '2026-03-02',
        from: 'c',
        to: 'u',
        amount: 150,
        notes: '',
      },
    ]
    const b = accountBalances(s, '2026-03')
    expect(b.map((x) => x.signed)).toEqual([850, 300]) // 150 CAD = 100 USD
  })
  it('keeps an account currency through parseState', () => {
    const s = base()
    expect(parseState(s)?.accounts[1].currency).toBe('USD')
  })
  it('loads older blobs and keeps valid rates only', () => {
    expect(parseState({ ...starter() })?.rates).toBeUndefined()
    expect(parseState({ ...starter(), rates: { USD: 1.3 } })?.rates).toEqual({
      USD: 1.3,
    })
    expect(
      parseState({ ...starter(), rates: { USD: -2 } })?.rates,
    ).toBeUndefined()
  })
})
