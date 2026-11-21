const percent = new Intl.NumberFormat('en-CA', {
  style: 'percent',
  maximumFractionDigits: 1,
})
const make = (currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency })
let money = make('CAD')

/** Switch the display currency (called when the ledger's currency changes). */
export function setCurrency(code: string) {
  try {
    money = make(code)
  } catch {
    money = make('CAD')
  }
}

const cache = new Map<string, Intl.NumberFormat>()
/** Format an amount in a specific currency (an account's own currency). */
export function fmtIn(code: string, v: number): string {
  let f = cache.get(code)
  if (!f) {
    try {
      f = make(code)
    } catch {
      f = make('CAD')
    }
    cache.set(code, f)
  }
  return f.format(Math.abs(v) < 0.000001 ? 0 : v)
}

/** null renders as an em dash (no data). Avoids "-$0.00". */
export const fmt = (v: number | null) =>
  v === null ? '—' : money.format(Math.abs(v) < 0.000001 ? 0 : v)
export const pct = (v: number | null) => (v === null ? '—' : percent.format(v))
