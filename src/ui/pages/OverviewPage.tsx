import { useMemo } from 'react'
import { report } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { DataTable } from '../components/DataTable'
import { Panel } from '../components/Panel'
import { fmt, pct } from '../format'

export function OverviewPage() {
  const state = useLedger((s) => s.state)
  const r = useMemo(() => report(state), [state])
  const stats: [string, string, string][] = [
    ['Take-home income', fmt(r.planIncome), 'Actual ' + fmt(r.actualIncome)],
    [
      'Monthly spending',
      fmt(r.planSpend),
      'Actual ' + fmt(r.active ? r.actualSpend : null),
    ],
    ['Cash before target', fmt(r.planCash), 'Actual ' + fmt(r.actualCash)],
    ['Savings rate', pct(r.actualRate), 'Planned transfers ' + pct(r.planRate)],
  ]
  const progress =
    r.target > 0 ? Math.max(0, Math.min((r.general / r.target) * 100, 100)) : 0
  return (
    <>
      <section className="bg-nav grid gap-6 rounded-xl p-6 text-white md:grid-cols-2">
        <div>
          <div className="text-xs font-bold tracking-widest text-slate-300">
            MONTHLY CASH AFTER SAVINGS TARGET
          </div>
          <div
            data-testid="remaining"
            className={
              'mt-2 text-5xl font-bold ' +
              ((r.afterTarget ?? 0) < 0 ? 'text-red-300' : 'text-mint')
            }
          >
            {fmt(r.afterTarget)}
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {r.planIncome === null
              ? 'Add your take-home pay in Budget to calculate cash left.'
              : fmt(r.planCash) +
                ' available before the general savings target.'}
          </p>
        </div>
        <div>
          <div className="flex justify-between text-sm">
            <span>General savings</span>
            <strong>{fmt(r.target)} target</strong>
          </div>
          <progress
            className="my-2 w-full"
            max={100}
            value={progress}
            aria-label="Monthly savings target progress"
          />
          <p className="text-sm text-slate-300">
            {r.target > 0
              ? `${fmt(r.general)} saved this month · ${fmt(r.leftToSave)} still to save`
              : 'Set a monthly target in Budget.'}
          </p>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value, detail]) => (
          <div
            key={label}
            className="border-line grid gap-1 rounded-xl border bg-white p-4"
          >
            <span className="text-muted text-sm">{label}</span>
            <strong className="text-2xl">{value}</strong>
            <small className="text-muted">{detail}</small>
          </div>
        ))}
      </div>
      <Panel
        title="Category breakdown"
        subtitle="Spending only. Savings transfers are tracked separately."
      >
        <DataTable
          caption="Category breakdown"
          headers={['Category', 'Planned', 'Actual', 'Plan remaining']}
          empty="Add expenses or transactions to see the category breakdown."
          rows={r.breakdown.map((row) => ({
            key: row.name,
            cells: [
              row.name,
              fmt(row.planned),
              fmt(r.active ? row.actual : null),
              fmt(r.active ? row.planned - row.actual : null),
            ],
          }))}
        />
      </Panel>
    </>
  )
}
