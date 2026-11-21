import type { State, Transaction } from './types'

export const currencies = [
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'NZD', name: 'New Zealand dollar' },
  { code: 'CHF', name: 'Swiss franc' },
  { code: 'JPY', name: 'Japanese yen' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'MXN', name: 'Mexican peso' },
] as const

/** Excel number format showing the currency symbol as shown in en-CA ("$", "US$", "€"). */
export function cashFormat(code: string): string {
  const parts = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currencies.some((c) => c.code === code) ? code : 'CAD',
  }).formatToParts(1)
  const symbol = parts.find((p) => p.type === 'currency')?.value ?? '$'
  const digits = parts.some((p) => p.type === 'fraction') ? '.00' : ''
  const body = `"${symbol.replace(/"/g, '')}"#,##0${digits}`
  return `${body};(${body})`
}

type Priced = Pick<State, 'currency' | 'rates' | 'accounts' | 'transactions'>

/** Ledger-currency value of one unit of `code`; 1 for the ledger currency or a missing rate. */
export function rateFor(
  state: Pick<State, 'currency' | 'rates'>,
  code?: string,
) {
  const rate = code && code !== state.currency ? state.rates?.[code] : 1
  return rate && rate > 0 ? rate : 1
}

/** Currency of the account a transaction belongs to (unassigned rows use the first account). */
export function currencyOf(
  state: Pick<State, 'currency' | 'accounts'>,
  id?: string,
) {
  const a = state.accounts.find((x) => x.id === id) ?? state.accounts[0]
  return a?.currency || state.currency
}

/** Transactions with amounts and splits converted to the ledger currency. */
export function baseTransactions(state: Priced): Transaction[] {
  if (
    !(state.accounts ?? []).some(
      (a) => a.currency && a.currency !== state.currency,
    )
  )
    return state.transactions
  const scale = (v: Transaction['amount'], k: number) =>
    v === '' || !Number.isFinite(Number(v)) ? v : Number(v) * k
  return state.transactions.map((t) => {
    const k = rateFor(state, currencyOf(state, t.account))
    return k === 1
      ? t
      : {
          ...t,
          amount: scale(t.amount, k),
          splits: t.splits?.map((s) => ({ ...s, amount: scale(s.amount, k) })),
        }
  })
}
