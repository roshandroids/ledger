import { useReducedMotion } from 'motion/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
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
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke="#dce4ec" />
            <XAxis dataKey="name" tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => fmt(v)}
              width={80}
              tickLine={false}
              axisLine={false}
            />
            <Legend />
            <Bar
              dataKey="Plan"
              fill="#7dd9bc"
              radius={4}
              isAnimationActive={!reduced}
            />
            <Bar
              dataKey="Actual"
              fill="#5774c9"
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
