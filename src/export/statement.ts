import { jsPDF } from 'jspdf'
import { report, rolloverCarry, type State } from '../domain'

const ink = '#14263b'
const muted = '#50657b'
const navy = '#132b42'
const teal = '#267d70'
const blue = '#426eb1'
const paper = '#eff4f8'

/** Build a statement for the selected month with the same totals as Overview. */
export function statementPdf(state: State, generatedAt = new Date()) {
  const r = report(state)
  const carry = state.rollover ? rolloverCarry(state) : null
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const month = new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(state.month + '-01T00:00:00Z'))
  const timestamp = new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(generatedAt)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const number = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: state.currency,
    currencyDisplay: 'code',
  })
  const money = (n: number | null) =>
    n === null
      ? '—'
      : number.format(Math.abs(n) < 0.000001 ? 0 : n).replaceAll('\u00a0', ' ')
  const label = (
    value: string,
    x: number,
    y: number,
    size = 10,
    color = ink,
    bold = false,
    right = false,
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    doc.text(value, x, y, { align: right ? 'right' : 'left' })
  }
  const box = (
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
  ) => {
    if (width <= 0 || height <= 0) return
    doc.setFillColor(fill)
    doc.rect(x, y, width, height, 'F')
  }
  doc.setProperties({
    title: `Ledger monthly statement - ${month}`,
    creator: 'Ledger',
  })
  doc.setCreationDate(generatedAt)
  box(0, 0, 210, 53, navy)
  label('LEDGER', 15, 14, 11, '#9ce4d3', true)
  label('Monthly statement', 15, 29, 27, '#ffffff', true)
  label(
    state.sample ? month + '  /  Sample data' : month,
    15,
    41,
    13,
    '#ffffff',
  )
  label(
    `Generated ${timestamp} (${timezone})`,
    195,
    47,
    8,
    '#d4e3ee',
    false,
    true,
  )

  const summary = [
    ['Take-home income', r.planIncome, r.actualIncome],
    ['Spending', r.planSpend, r.active ? r.actualSpend : null],
    ['Net savings', r.planSaved, r.active ? r.actualSaved : null],
  ] as const
  const rows = [
    ...summary,
    ['Cash before savings target', r.planCash, r.actualCash] as const,
  ]
  label('Monthly summary', 15, 65, 14, ink, true)
  box(15, 70, 180, 9, navy)
  label('Cash flow', 19, 76, 9, '#ffffff', true)
  label('Planned', 146, 76, 9, '#ffffff', true, true)
  label('Actual', 191, 76, 9, '#ffffff', true, true)
  rows.forEach(([name, plan, actual], i) => {
    const top = 79 + i * 9
    box(15, top, 180, 9, i % 2 === 0 ? paper : '#ffffff')
    label(name, 19, top + 6)
    label(money(plan), 146, top + 6, 10, ink, false, true)
    label(money(actual), 191, top + 6, 10, ink, false, true)
  })
  label(
    `Savings target  ${money(r.target)}    |    Saved toward target  ${money(r.general)}`,
    15,
    123,
    9,
    muted,
  )
  label(
    `Planned cash after target  ${money(r.afterTarget)}`,
    15,
    130,
    9,
    ink,
    true,
  )

  box(15, 139, 88, 72, paper)
  box(107, 139, 88, 72, paper)
  label('Planned vs. actual', 20, 148, 12, ink, true)
  label('Top planned spending', 112, 148, 12, ink, true)
  box(20, 153, 3, 3, teal)
  label('Planned', 25, 156, 8, muted)
  box(44, 153, 3, 3, blue)
  label('Actual', 49, 156, 8, muted)
  const amounts = summary.flatMap(([, plan, actual]) => [
    plan ?? 0,
    actual ?? 0,
  ])
  const low = Math.min(0, ...amounts)
  const high = Math.max(0, ...amounts)
  const x = (value: number) => 20 + ((value - low) / (high - low || 1)) * 78
  doc.setDrawColor('#94a9b9')
  doc.line(x(0), 166, x(0), 203)
  summary.forEach(([name, plan, actual], i) => {
    const y = 164 + i * 15
    label(name, 20, y, 8)
    for (const [value, offset, color] of [
      [plan, 2, teal],
      [actual, 6, blue],
    ] as const) {
      if (value !== null)
        box(
          Math.min(x(0), x(value)),
          y + offset,
          Math.abs(x(value) - x(0)),
          2.5,
          color,
        )
    }
  })

  const top = r.breakdown
    .filter((row) => row.planned > 0)
    .sort((a, b) => b.planned - a.planned)
    .slice(0, 4)
  if (!top.length) label('No planned spending this month.', 112, 160, 8, muted)
  top.forEach(({ name, planned }, i) => {
    const y = 159 + i * 12
    doc.setFontSize(8)
    label(doc.splitTextToSize(name, 45)[0], 112, y, 8)
    label(money(planned), 190, y, 8, ink, false, true)
    box(112, y + 2, (78 * planned) / top[0].planned, 2.5, teal)
  })

  const columns = carry
    ? ([
        [112, 'Planned'],
        [138, 'Carried'],
        [164, 'Actual'],
        [191, 'Remaining'],
      ] as const)
    : ([
        [127, 'Planned'],
        [159, 'Actual'],
        [191, 'Remaining'],
      ] as const)
  const categoryHeader = (y: number) => {
    label('Spending by category', 15, y, 14, ink, true)
    box(15, y + 4, 180, 9, navy)
    label('Category', 19, y + 10, 9, '#ffffff', true)
    columns.forEach(([x, title]) =>
      label(title, x, y + 10, 9, '#ffffff', true, true),
    )
    return y + 13
  }
  let y = categoryHeader(220)
  if (!r.breakdown.length)
    label('No spending categories this month.', 19, y + 6, 10, muted)
  r.breakdown.forEach((row, i) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines: string[] = doc.splitTextToSize(row.name, carry ? 63 : 75)
    const height = Math.max(7.5, 4 * lines.length + 3.5)
    if (y + height > 278) {
      doc.addPage()
      label(`LEDGER  /  ${month}`, 15, 15, 10, teal, true)
      y = categoryHeader(26)
    }
    const carried = carry?.get(row.name.toLocaleLowerCase('en-CA')) ?? 0
    const values = [
      row.planned,
      ...(carry ? [carried] : []),
      r.active ? row.actual : null,
      r.active ? row.planned + carried - row.actual : null,
    ]
    box(15, y, 180, height, i % 2 === 0 ? paper : '#ffffff')
    lines.forEach((line, index) => label(line, 19, y + 5 + index * 4, 9))
    columns.forEach(([x], index) =>
      label(money(values[index]), x, y + 5, 9, ink, false, true),
    )
    y += height
  })
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setDrawColor('#cbd8e4')
    doc.line(15, 282, 195, 282)
    label(`Ledger  /  ${month}  /  ${state.currency}`, 15, 288, 8, muted)
    label(`Page ${page} of ${pages}`, 195, 288, 8, muted, false, true)
  }
  return doc
}
