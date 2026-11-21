import { useTranslation } from '../i18n'
import { useReducedMotion } from 'motion/react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { palette } from '../chartData'
import { CategoryIcon } from './CategoryIcon'
import { fmt } from '../format'

interface Props {
  rows: { name: string; value: number }[]
  total: number
}

export function SpendingDonut({ rows, total }: Props) {
  const t = useTranslation()
  const reduced = useReducedMotion()
  if (rows.length === 0) {
    return (
      <p className="text-muted py-6 text-center text-sm">
        {t('Add budget items to see a breakdown.')}
      </p>
    )
  }
  return (
    <div className="@container">
      <div className="grid min-w-0 items-center gap-4 @min-[28rem]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div
          aria-hidden="true"
          className="relative mx-auto h-40 w-full max-w-52 @min-[28rem]:h-48"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer={false}>
              <Pie
                rootTabIndex={-1}
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="100%"
                stroke="none"
                isAnimationActive={!reduced}
              >
                {rows.map((_, i) => (
                  <Cell key={i} fill={palette[i]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => fmt(Number(v))}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 -z-0 grid place-content-center text-center">
            <span className="text-muted text-xs">{t('Spending')}</span>
            <strong>{fmt(total)}</strong>
          </div>
        </div>
        <ul className="grid min-w-0 gap-2 text-sm">
          {rows.map((r, i) => (
            <li
              key={r.name}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2"
            >
              <div className="flex min-w-0 items-start gap-2">
                <i
                  aria-hidden="true"
                  className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: palette[i] }}
                />
                <span className="shrink-0">
                  <CategoryIcon name={r.name} />
                </span>
                <span className="min-w-0 wrap-anywhere">{r.name}</span>
              </div>
              <b className="text-right">{fmt(r.value)}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
