import { displayLocale } from './preferences'

let currency = 'CAD'
const cache = new Map<string, Intl.NumberFormat>()

/** Switch the display currency when the ledger’s currency changes. */
export function setCurrency(code: string) {
  currency = code
}

/** Format an amount in a specific currency (an account's own currency). */
export function fmtIn(code: string, v: number): string {
  const locale = displayLocale()
  const key = locale + '-' + code
  let f = cache.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, { style: 'currency', currency: code })
    } catch {
      f = new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' })
    }
    cache.set(key, f)
  }
  return f.format(Math.abs(v) < 0.000001 ? 0 : v)
}

/** null renders as an em dash (no data). Avoids "-$0.00". */
export const fmt = (v: number | null) => (v === null ? '—' : fmtIn(currency, v))
export const pct = (v: number | null) =>
  v === null
    ? '—'
    : new Intl.NumberFormat(displayLocale(), {
        style: 'percent',
        maximumFractionDigits: 1,
      }).format(v)
