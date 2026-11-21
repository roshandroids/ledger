import type { Transaction, TransactionType } from '../domain'

export const NONE = '__none__'
export type SortKey =
  'entry' | 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category'

export interface TxFilter {
  q: string
  type: '' | TransactionType
  /** '' = all, NONE = uncategorized, otherwise a category name. */
  category: string
  /** '' = all, otherwise an account id (unassigned rows count as the default account). */
  account: string
  /** '' = all, otherwise a tag. */
  tag: string
  from: string
  to: string
  min: string
  max: string
  sort: SortKey
}

export const emptyFilter: TxFilter = {
  q: '',
  type: '',
  category: '',
  account: '',
  tag: '',
  from: '',
  to: '',
  min: '',
  max: '',
  sort: 'entry',
}

const keys = Object.keys(emptyFilter) as (keyof TxFilter)[]

export function parseFilter(p: URLSearchParams): TxFilter {
  const f = { ...emptyFilter } as Record<string, string>
  for (const k of keys) f[k] = p.get(k) ?? f[k]
  return f as unknown as TxFilter
}

/** Only non-default values, so the URL stays short. */
export function toParams(f: TxFilter): URLSearchParams {
  const p = new URLSearchParams()
  for (const k of keys) if (f[k] !== emptyFilter[k]) p.set(k, f[k])
  return p
}

export const isFiltered = (f: TxFilter) =>
  keys.some((k) => k !== 'sort' && f[k] !== emptyFilter[k])

const ISO = /^\d{4}-\d{2}-\d{2}$/
const lower = (s: string) => s.trim().toLocaleLowerCase('en-CA')
const num = (v: string | number) => (v === '' ? NaN : Number(v))

export interface TxView {
  tx: Transaction
  /** Position in state.transactions, so edits and removals hit the right row. */
  index: number
}

export function filterTransactions(
  txs: Transaction[],
  f: TxFilter,
  accountOf: (t: Transaction) => string | null = (t) => t.account ?? null,
): TxView[] {
  const q = lower(f.q)
  const tag = lower(f.tag)
  const min = num(f.min)
  const max = num(f.max)
  const rows = txs
    .map((tx, index) => ({ tx, index }))
    .filter(({ tx }) => {
      if (f.type && tx.type !== f.type) return false
      if (f.category) {
        const c = lower(tx.category)
        if (f.category === NONE ? c !== '' : c !== lower(f.category))
          return false
      }
      if (f.account && accountOf(tx) !== f.account) return false
      if (tag && !(tx.tags ?? []).some((x) => lower(x) === tag)) return false
      if (f.from && !(tx.date >= f.from)) return false
      if (f.to && !(tx.date <= f.to)) return false
      const amount = num(tx.amount)
      if (!Number.isNaN(min) && !(amount >= min)) return false
      if (!Number.isNaN(max) && !(amount <= max)) return false
      if (
        q &&
        !lower(
          `${tx.category} ${tx.notes} ${(tx.tags ?? []).join(' ')}`,
        ).includes(q)
      )
        return false
      return true
    })
  // Invalid dates/amounts sort last in either direction.
  const dir = f.sort.endsWith('desc') ? -1 : 1
  const cmp = (a: TxView, b: TxView): number => {
    if (f.sort.startsWith('date')) {
      const bad = (d: string) => !ISO.test(d)
      if (bad(a.tx.date) || bad(b.tx.date))
        return bad(a.tx.date) ? (bad(b.tx.date) ? 0 : 1) : -1
      if (a.tx.date === b.tx.date) return 0
      return (a.tx.date < b.tx.date ? -1 : 1) * dir
    }
    if (f.sort.startsWith('amount')) {
      const x = num(a.tx.amount)
      const y = num(b.tx.amount)
      if (Number.isNaN(x) || Number.isNaN(y))
        return Number.isNaN(x) ? (Number.isNaN(y) ? 0 : 1) : -1
      return (x - y) * dir
    }
    return lower(a.tx.category).localeCompare(lower(b.tx.category), 'en-CA')
  }
  return f.sort === 'entry' ? rows : rows.sort(cmp)
}
