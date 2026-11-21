import { useMemo } from 'react'
import { limitStatus, report, rolloverCarry } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { ringRows } from '../chartData'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { CashFlowChart } from '../components/CashFlowChart'
import { SpendingDonut } from '../components/SpendingDonut'
import { CategoryIcon } from '../components/CategoryIcon'
import { LimitBar } from '../components/LimitBar'
import { BillsPanel } from '../components/BillsPanel'
import { useBills } from '../useBills'
import { Notice } from '../components/Notice'
import { DataTable } from '../components/DataTable'
import { Panel } from '../components/Panel'
import { fmt, pct } from '../format'

export function OverviewPage() {
  const state = useLedger((s) => s.state)
  const r = useMemo(() => report(state), [state])
  const carry = useMemo(
    () => (state.rollover ? rolloverCarry(state) : null),
    [state],
  )
  const carried = (name: string) =>
    carry?.get(name.toLocaleLowerCase('en-CA')) ?? 0
  const limits = r.active
    ? r.breakdown.flatMap((row) => {
        const s = limitStatus(row.actual, row.planned + carried(row.name))
        return s ? [{ row, ...s }] : []
      })
    : []
  const bills = useBills()
  const attention = (bills ?? []).filter(
    (b) =>
      (b.status === 'overdue' || b.status === 'soon') &&
      b.due.rule.type !== 'Income',
  )
  const flagged = limits.filter((l) => l.level !== 'ok')
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
            <AnimatedNumber value={r.afterTarget} format={fmt} />
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
      {attention.length > 0 && (
        <Notice>
          {attention
            .map(
              (b) =>
                `${b.due.rule.name || b.due.rule.category || 'A bill'} is ${b.status === 'overdue' ? 'overdue' : 'due soon'}`,
            )
            .join('. ')}
          .
        </Notice>
      )}
      {flagged.length > 0 && (
        <Notice>
          {flagged
            .map(
              (l) =>
                `${l.row.name} is ${l.level === 'over' ? 'over' : 'near'} its limit (${pct(l.ratio)})`,
            )
            .join('. ')}
          .
        </Notice>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value, detail]) => (
          <div
            key={label}
            className="border-line grid gap-1 rounded-xl border bg-card p-4"
          >
            <span className="text-muted text-sm">{label}</span>
            <strong className="text-2xl">{value}</strong>
            <small className="text-muted">{detail}</small>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel
          title="Monthly cash flow"
          subtitle="Planned vs. actual for the selected month"
        >
          <CashFlowChart
            rows={[
              { name: 'Income', plan: r.planIncome, actual: r.actualIncome },
              {
                name: 'Spending',
                plan: r.planSpend,
                actual: r.active ? r.actualSpend : null,
              },
              {
                name: 'Net savings',
                plan: r.planSaved,
                actual: r.active ? r.actualSaved : null,
              },
            ]}
          />
        </Panel>
        <Panel title="Where it goes" subtitle="Planned spending by category">
          <SpendingDonut rows={ringRows(r.breakdown)} total={r.planSpend} />
        </Panel>
      </div>
      {bills && <BillsPanel bills={bills} />}
      <Panel
        title="Category breakdown"
        subtitle="Spending only. Savings transfers are tracked separately."
      >
        <DataTable
          caption="Category breakdown"
          headers={[
            'Category',
            'Planned',
            ...(carry ? ['Carried over'] : []),
            'Actual',
            'Plan remaining',
            'Limit used',
          ]}
          empty="Add expenses or transactions to see the category breakdown."
          rows={r.breakdown.map((row) => ({
            key: row.name,
            cells: [
              <span className="flex items-center gap-2">
                <CategoryIcon name={row.name} />
                {row.name}
              </span>,
              fmt(row.planned),
              ...(carry ? [fmt(carried(row.name))] : []),
              fmt(r.active ? row.actual : null),
              fmt(
                r.active ? row.planned + carried(row.name) - row.actual : null,
              ),
              (() => {
                const s = limits.find((l) => l.row === row)
                return s ? (
                  <LimitBar ratio={s.ratio} level={s.level} name={row.name} />
                ) : (
                  '—'
                )
              })(),
            ],
          }))}
        />
      </Panel>
    </>
  )
}
