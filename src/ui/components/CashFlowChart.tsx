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

export interface FlowRow {
  name: string
  plan: number | null
  actual: number | null
}

export function CashFlowChart({ rows }: { rows: FlowRow[] }) {
  const reduced = useReducedMotion()
  const data = rows.map((r) => ({
    name: r.name,
    Plan: r.plan ?? 0,
    Actual: r.actual ?? 0,
  }))
  return (
    <div>
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
            <Bar
              dataKey="Plan"
              fill="var(--plan)"
              radius={4}
              isAnimationActive={!reduced}
            />
            <Bar
              dataKey="Actual"
              fill="var(--actual)"
              radius={4}
              isAnimationActive={!reduced}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Monthly cash flow, planned vs. actual</caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col">Plan</th>
            <th scope="col">Actual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <th scope="row">{r.name}</th>
              <td>{fmt(r.plan)}</td>
              <td>{fmt(r.actual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
