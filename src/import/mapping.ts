import type { Transaction } from '../domain'

export type DateFormat = 'ymd' | 'mdy' | 'dmy'
export interface Mapping {
  hasHeader: boolean
  /** Column indexes; -1 means not used. Amount wins over debit/credit when set. */
  date: number
  description: number
  amount: number
  debit: number
  credit: number
  dateFormat: DateFormat
  /** Which sign means money out, for a single signed amount column. */
  expenseSign: 'negative' | 'positive'
}
export interface CategoryRule {
  keyword: string
  category: string
}
export interface Candidate {
  tx: Transaction
  error?: string
  duplicate?: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

export function parseDate(raw: string, format: DateFormat): string {
  const s = raw.trim().split(/[ T]/)[0]
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s)
  const parts = s.split(/[/.-]/)
  let y: number, m: number, d: number
  if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]]
  else if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    const n = parts.map(Number)
    ;[y, m, d] =
      format === 'ymd'
        ? [n[0], n[1], n[2]]
        : format === 'mdy'
          ? [n[2], n[0], n[1]]
          : [n[2], n[1], n[0]]
  } else return ''
  if (y < 100) y += 2000
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? `${y}-${pad(m)}-${pad(d)}`
    : ''
}

/** Signed number from bank text: `$1,234.50`, `(12.00)`, `12,50`, `-5`, `5-`. NaN if none. */
export function parseAmount(raw: string): number {
  const s = raw.trim()
  if (!/\d/.test(s)) return NaN
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-') || s.endsWith('-')
  let digits = s.replace(/[^\d.,]/g, '')
  const comma = digits.lastIndexOf(',')
  const dot = digits.lastIndexOf('.')
  if (comma > dot && /,\d{1,2}$/.test(digits))
    digits = digits.replace(/\./g, '').replace(',', '.')
  else digits = digits.replace(/,/g, '')
  const n = Number(digits)
  return Number.isFinite(n) ? (negative ? -n : n) : NaN
}

/** Pre-fill a mapping from header names; falls back to a headerless date/description/amount layout. */
export function guessMapping(rows: string[][]): Mapping {
  const base: Mapping = {
    hasHeader: false,
    date: 0,
    description: 1,
    amount: 2,
    debit: -1,
    credit: -1,
    dateFormat: 'ymd',
    expenseSign: 'negative',
  }
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase())
  const find = (re: RegExp) => head.findIndex((h) => re.test(h))
  const date = find(/date/)
  if (date < 0) return base
  const debit = find(/debit|withdraw/)
  const credit = find(/credit|deposit/)
  const amount = find(/^(amount|cad\$?|amt)\b|amount/)
  return {
    ...base,
    hasHeader: true,
    date,
    description: Math.max(find(/descr|memo|payee|merchant|details|name/), -1),
    amount: amount >= 0 ? amount : debit >= 0 || credit >= 0 ? -1 : 2,
    debit,
    credit,
  }
}

const at = (row: string[], i: number) => (i >= 0 ? (row[i] ?? '') : '')

export function categorize(description: string, rules: CategoryRule[]): string {
  const d = description.toLowerCase()
  return (
    rules.find(
      (r) => r.keyword.trim() && d.includes(r.keyword.trim().toLowerCase()),
    )?.category ?? ''
  )
}

export function mapRows(
  rows: string[][],
  m: Mapping,
  rules: CategoryRule[],
): Candidate[] {
  return rows.slice(m.hasHeader ? 1 : 0).map((row) => {
    const description = at(row, m.description).trim().slice(0, 300)
    const date = parseDate(at(row, m.date), m.dateFormat)
    let type: Transaction['type'] = 'Expense'
    let amount = NaN
    if (m.amount >= 0) {
      const v = parseAmount(at(row, m.amount))
      amount = Math.abs(v)
      type = (m.expenseSign === 'negative' ? v < 0 : v > 0)
        ? 'Expense'
        : 'Income'
    } else {
      const out = Math.abs(parseAmount(at(row, m.debit)))
      const inn = Math.abs(parseAmount(at(row, m.credit)))
      if (out > 0) [amount, type] = [out, 'Expense']
      else if (inn > 0) [amount, type] = [inn, 'Income']
      else amount = 0
    }
    const error = !date
      ? 'Invalid date'
      : Number.isNaN(amount)
        ? 'Invalid amount'
        : amount === 0
          ? 'No amount'
          : undefined
    return {
      tx: {
        date,
        type,
        category: categorize(description, rules),
        amount: Number.isNaN(amount) ? '' : amount,
        goal: '',
        notes: description,
      },
      error,
    }
  })
}

const key = (t: Transaction) =>
  [
    t.date,
    t.type,
    Number(t.amount).toFixed(2),
    t.notes.trim().toLowerCase(),
  ].join('|')

/**
 * Flag candidates already present in `existing`. Counted, so two identical bank
 * rows only match two identical existing rows, never more.
 */
export function markDuplicates(
  list: Candidate[],
  existing: Transaction[],
): Candidate[] {
  const seen = new Map<string, number>()
  for (const t of existing) seen.set(key(t), (seen.get(key(t)) ?? 0) + 1)
  return list.map((c) => {
    if (c.error) return c
    const left = seen.get(key(c.tx)) ?? 0
    if (left > 0) {
      seen.set(key(c.tx), left - 1)
      return { ...c, duplicate: true }
    }
    return c
  })
}

const SETTINGS_KEY = 'ledger-import-settings'
export interface ImportSettings {
  rules: CategoryRule[]
  /** Last mapping, reused when the file's header row matches. */
  mapping?: Mapping
  signature?: string
}
export function loadSettings(): ImportSettings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return { rules: Array.isArray(v.rules) ? v.rules : [], ...v }
  } catch {
    return { rules: [] }
  }
}
export function saveSettings(s: ImportSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // storage unavailable: mapping and rules are not remembered
  }
}

export const rulesToText = (rules: CategoryRule[]) =>
  rules.map((r) => `${r.keyword} = ${r.category}`).join('\n')
export const textToRules = (text: string): CategoryRule[] =>
  text.split('\n').flatMap((line) => {
    const i = line.indexOf('=')
    const keyword = line.slice(0, i).trim()
    const category = line.slice(i + 1).trim()
    return i > 0 && keyword && category ? [{ keyword, category }] : []
  })
