import { useReducedMotion } from 'motion/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmt } from '../format'

export interface TrendSeries {
  key: string
  color: string
}

/** Grouped bars per month. Decorative: the page shows the same numbers in a table. */
export function TrendChart({
  data,
  series,
}: {
  data: ({ name: string } & Record<string, number | string>)[]
  series: TrendSeries[]
}) {
  const reduced = useReducedMotion()
  return (
    <div aria-hidden="true" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer={false}
          data={data}
          margin={{ left: 8, right: 8 }}
        >
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="name" tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => fmt(v)}
            width={80}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v) => fmt(Number(v))}
            cursor={{ fill: 'var(--line)', opacity: 0.4 }}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 8,
            }}
          />
          <Legend />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={s.color}
              radius={4}
              isAnimationActive={!reduced}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
