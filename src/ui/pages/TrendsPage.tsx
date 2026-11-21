import { useTranslation } from '../i18n'
import { useMemo, useState } from 'react'
import { monthSeries } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { DataTable } from '../components/DataTable'
import { Panel } from '../components/Panel'
import { Select } from '../components/Select'
import { TrendChart } from '../components/TrendChart'
import { fmt, pct } from '../format'
import { monthLabel, palette } from '../chartData'

const ranges: [string, string][] = [
  ['3', 'Last 3 months'],
  ['6', 'Last 6 months'],
  ['12', 'Last 12 months'],
]
const ALL = ''

export function TrendsPage() {
  const t = useTranslation()
  const state = useLedger((s) => s.state)
  const [range, setRange] = useState('6')
  const [category, setCategory] = useState(ALL)
  const series = useMemo(
    () => monthSeries(state, state.month, Number(range)),
    [state, range],
  )
  const categories = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of series)
      for (const r of p.breakdown) {
        const k = r.name.toLocaleLowerCase('en-CA')
        if (!seen.has(k)) seen.set(k, r.name)
      }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'en-CA'))
  }, [series])
  const picked = categories.some(([k]) => k === category) ? category : ALL
  const catRow = (p: (typeof series)[number]) =>
    p.breakdown.find((r) => r.name.toLocaleLowerCase('en-CA') === picked)

  const overall = series.map((p) => ({
    name: monthLabel(p.month),
    Income: p.income ?? 0,
    Spending: p.spend ?? 0,
    'Net savings': p.saved ?? 0,
  }))
  const byCategory = series.map((p) => ({
    name: monthLabel(p.month),
    Planned: catRow(p)?.planned ?? 0,
    Actual: catRow(p)?.actual ?? 0,
  }))
  const empty = series.every((p) => !p.active && p.income === null)

  return (
    <>
      <Panel
        title={t('Monthly trends')}
        subtitle="Actual income, spending and savings for the months ending at the selected month."
        action={
          <div className="w-44">
            <Select
              label="Range"
              value={range}
              options={ranges}
              onChange={setRange}
            />
          </div>
        }
      >
        {empty ? (
          <p className="text-muted text-sm">
            Record some transactions to see trends.
          </p>
        ) : (
          <TrendChart
            data={overall}
            series={[
              { key: 'Income', color: palette[0] },
              { key: 'Spending', color: palette[2] },
              { key: 'Net savings', color: palette[1] },
            ]}
          />
        )}
        <div className="mt-4">
          <DataTable
            caption="Income, spending and savings by month"
            headers={[
              'Month',
              'Income',
              'Spending',
              'Net savings',
              'Savings rate',
            ]}
            empty="No months to show."
            rows={series.map((p) => ({
              key: p.month,
              cells: [
                monthLabel(p.month),
                fmt(p.income),
                fmt(p.spend),
                fmt(p.saved),
                pct(p.rate),
              ],
            }))}
          />
        </div>
      </Panel>
      <Panel
        title={t('Category trend')}
        subtitle="Planned and actual spending for one category."
        action={
          <div className="w-52">
            <Select
              label="Trend category"
              value={picked}
              options={[[ALL, 'Choose a category'], ...categories]}
              onChange={setCategory}
            />
          </div>
        }
      >
        {picked === ALL ? (
          <p className="text-muted text-sm">Choose a category to compare.</p>
        ) : (
          <>
            <TrendChart
              data={byCategory}
              series={[
                { key: 'Planned', color: 'var(--plan)' },
                { key: 'Actual', color: 'var(--actual)' },
              ]}
            />
            <div className="mt-4">
              <DataTable
                caption="Category spending by month"
                headers={['Month', 'Planned', 'Actual']}
                empty="No months to show."
                rows={series.map((p) => ({
                  key: p.month,
                  cells: [
                    monthLabel(p.month),
                    fmt(catRow(p)?.planned ?? 0),
                    fmt(p.active ? (catRow(p)?.actual ?? 0) : null),
                  ],
                }))}
              />
            </div>
          </>
        )}
      </Panel>
    </>
  )
}
