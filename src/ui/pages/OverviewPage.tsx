import { useTranslation } from '../i18n'
import { useMemo, useState } from 'react'
import {
  limitStatus,
  monthSeries,
  report,
  rolloverCarry,
  unspentToSave,
} from '../../domain'
import { useLedger } from '../../store/useLedger'
import { monthLabel, ringRows } from '../chartData'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { CashFlowChart } from '../components/CashFlowChart'
import { TrendChart } from '../components/TrendChart'
import { SpendingDonut } from '../components/SpendingDonut'
import { CategoryIcon } from '../components/CategoryIcon'
import { LimitBar } from '../components/LimitBar'
import { BillsPanel } from '../components/BillsPanel'
import { useBills } from '../useBills'
import { Notice } from '../components/Notice'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { Panel } from '../components/Panel'
import { fmt, pct } from '../format'

export function OverviewPage() {
  const t = useTranslation()
  const state = useLedger((s) => s.state)
  const [saving, setSaving] = useState<{
    month: string
    amount: number
  } | null>(null)
  const [saveMessage, setSaveMessage] = useState<{
    month: string
    text: string
  } | null>(null)
  const r = useMemo(() => report(state), [state])
  const trend = useMemo(
    () =>
      monthSeries(state, state.month, 6).map(({ month, income, spend }) => ({
        name: month,
        Income: income,
        Spending: spend,
      })),
    [state],
  )
  const unspent = unspentToSave(state, r)
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
    [
      'Take-home income',
      fmt(r.planIncome),
      t('Actual') + ' ' + fmt(r.actualIncome),
    ],
    [
      'Monthly spending',
      fmt(r.planSpend),
      t('Actual') + ' ' + fmt(r.active ? r.actualSpend : null),
    ],
    [
      'Cash before target',
      fmt(r.planCash),
      t('Actual') + ' ' + fmt(r.actualCash),
    ],
    ['Savings rate', pct(r.actualRate), 'Planned transfers ' + pct(r.planRate)],
  ]
  const progress =
    r.target > 0 ? Math.max(0, Math.min((r.general / r.target) * 100, 100)) : 0
  return (
    <>
      <section className="from-nav to-nav-active grid bg-linear-to-br gap-5 rounded-xl p-5 text-white sm:p-6 lg:grid-cols-2">
        <div>
          <div className="text-xs font-bold tracking-widest text-slate-300">
            {t('Monthly cash after savings target').toLocaleUpperCase()}
          </div>
          <div
            data-testid="remaining"
            className={
              'mt-2 wrap-anywhere text-4xl font-bold sm:text-5xl ' +
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
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>{t('General savings')}</span>
            <strong>{fmt(r.target)} target</strong>
          </div>
          <progress
            className="savings-progress my-2 h-2 w-full"
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
      {unspent > 0 && (
        <Notice
          action={
            <button
              type="button"
              onClick={() => setSaving({ month: state.month, amount: unspent })}
              className="border-line rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              Record as savings
            </button>
          }
        >
          {fmt(unspent)} of unspent budget is available to save.
        </Notice>
      )}
      {saveMessage?.month === state.month && (
        <Notice>{saveMessage.text}</Notice>
      )}
      {saving && (
        <ConfirmDialog
          open
          title="Record unspent budget as savings"
          confirmLabel="Record savings"
          onClose={() => setSaving(null)}
          onConfirm={() => {
            const recorded = useLedger
              .getState()
              .saveUnspentBudget(saving.month, saving.amount)
            setSaveMessage({
              month: saving.month,
              text: recorded
                ? 'Recorded in General savings.'
                : 'The available amount changed. Review the month and try again.',
            })
          }}
        >
          Record {fmt(saving.amount)} in General savings for {saving.month}.
          This records a Ledger entry only.
          {state.rollover &&
            ' This amount will be deducted from the budget carried forward.'}
        </ConfirmDialog>
      )}
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map(([label, value, detail]) => (
          <div
            key={label}
            className="border-line grid min-w-0 content-start gap-1 rounded-xl border bg-card p-3 sm:p-4"
          >
            <span className="text-muted text-sm">{t(label)}</span>
            <strong className="wrap-anywhere text-xl sm:text-2xl">
              {value}
            </strong>
            <small className="text-muted">{detail}</small>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={t('Monthly cash flow')}
          subtitle={t('Planned vs. actual for the selected month')}
        >
          <CashFlowChart
            rows={[
              { name: t('Income'), plan: r.planIncome, actual: r.actualIncome },
              {
                name: t('Spending'),
                plan: r.planSpend,
                actual: r.active ? r.actualSpend : null,
              },
              {
                name: t('Net savings'),
                plan: r.planSaved,
                actual: r.active ? r.actualSaved : null,
              },
            ]}
          />
        </Panel>
        <Panel
          title={t('Where it goes')}
          subtitle={t('Planned spending by category')}
        >
          <SpendingDonut rows={ringRows(r.breakdown)} total={r.planSpend} />
        </Panel>
      </div>
      <Panel
        title={t('Income and spending trend')}
        subtitle={t('Actuals for the six months ending in the selected month')}
      >
        {trend.some((row) => row.Income !== null || row.Spending !== null) ? (
          <>
            <TrendChart
              data={trend.map((row) => ({
                ...row,
                name: monthLabel(row.name),
              }))}
              variant="line"
              series={[
                { key: 'Income', color: 'var(--actual)' },
                { key: 'Spending', color: 'var(--negative)' },
              ]}
            />
            <table className="sr-only">
              <caption>Actual income and spending by month</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Income</th>
                  <th scope="col">Spending</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{monthLabel(row.name)}</th>
                    <td>{fmt(row.Income)}</td>
                    <td>{fmt(row.Spending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-muted text-sm">
            {t(
              'Record transactions to see your income and spending over time.',
            )}
          </p>
        )}
      </Panel>
      {bills && <BillsPanel bills={bills} />}
      <Panel
        title={t('Category breakdown')}
        subtitle="Spending only. Savings transfers are tracked separately."
      >
        <DataTable
          caption={t('Category breakdown')}
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
