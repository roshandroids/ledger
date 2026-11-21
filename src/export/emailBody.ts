import { report, type State } from '../domain'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** Subject plus plain-text and HTML bodies summarising the month, same totals as Overview. */
export function emailContent(state: State) {
  const r = report(state)
  const month = new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(state.month + '-01T00:00:00Z'))
  const fmt = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: state.currency,
  })
  const money = (n: number | null) => (n === null ? '—' : fmt.format(n))
  const rows: [string, number | null, number | null][] = [
    ['Income', r.planIncome, r.actualIncome],
    ['Spending', r.planSpend, r.actualSpend],
    ['Saved', r.planSaved, r.actualSaved],
    ['Left over', r.planCash, r.actualCash],
  ]
  const text = [
    `Your Ledger statement for ${month}`,
    '',
    ...rows.map(([n, p, a]) => `${n}: planned ${money(p)}, actual ${money(a)}`),
    '',
    'Attached: the full Excel workbook and a PDF statement.',
    'Sent from your Ledger app.',
  ].join('\n')
  const cell = 'padding:10px 12px;border-bottom:1px solid #e3e9ef;'
  const html = `<!doctype html><html><body style="margin:0;background:#eff4f8;font-family:Arial,Helvetica,sans-serif;color:#14263b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#132b42;color:#fff;padding:22px 24px"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9fd4c9">Ledger</div><div style="font-size:22px;font-weight:bold;margin-top:4px">${esc(month)} statement</div></td></tr>
<tr><td style="padding:24px"><p style="margin:0 0 16px;font-size:14px;line-height:1.5">Here is your budget and expense summary for ${esc(month)}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #e3e9ef;border-radius:6px">
<tr style="background:#eff4f8;color:#50657b;font-size:12px;text-transform:uppercase"><td style="${cell}">&nbsp;</td><td align="right" style="${cell}">Planned</td><td align="right" style="${cell}">Actual</td></tr>
${rows
  .map(
    ([n, p, a]) =>
      `<tr><td style="${cell}font-weight:bold">${n}</td><td align="right" style="${cell}">${esc(money(p))}</td><td align="right" style="${cell}">${esc(money(a))}</td></tr>`,
  )
  .join('\n')}
</table>
<p style="margin:16px 0 0;font-size:14px;line-height:1.5">The full Excel workbook and a PDF statement are attached.</p></td></tr>
<tr><td style="padding:14px 24px;background:#eff4f8;color:#50657b;font-size:12px">Sent from your Ledger app. Your data stays in your browser and Google account.</td></tr>
</table></td></tr></table></body></html>`
  return { subject: `Ledger statement — ${month}`, text, html }
}
