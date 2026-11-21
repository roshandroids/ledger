import { useReducedMotion } from 'motion/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

/** Month-by-month chart with values also available in the caller’s table. */
export function TrendChart({
  data,
  series,
  variant = 'bar',
}: {
  data: ({ name: string } & Record<string, number | string | null>)[]
  series: TrendSeries[]
  variant?: 'bar' | 'line'
}) {
  const reduced = useReducedMotion()
  const Chart = variant === 'line' ? LineChart : BarChart
  return (
    <div aria-hidden="true" className="h-60 min-w-0 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <Chart
          accessibilityLayer={false}
          data={data}
          margin={{ left: 8, right: 8 }}
        >
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            minTickGap={12}
          />
          <YAxis
            tickFormatter={(v: number) => fmt(v)}
            width="auto"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
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
          {series.map((s) =>
            variant === 'line' ? (
              <Line
                key={s.key}
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: s.color }}
                isAnimationActive={!reduced}
              />
            ) : (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={s.color}
                radius={4}
                isAnimationActive={!reduced}
              />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}
