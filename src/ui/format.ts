const money = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
})
const percent = new Intl.NumberFormat('en-CA', {
  style: 'percent',
  maximumFractionDigits: 1,
})

/** null renders as an em dash (no data). Avoids "-$0.00". */
export const fmt = (v: number | null) =>
  v === null ? '—' : money.format(Math.abs(v) < 0.000001 ? 0 : v)
export const pct = (v: number | null) => (v === null ? '—' : percent.format(v))
