import { useReducedMotion } from 'motion/react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { palette } from '../chartData'
import { fmt } from '../format'

interface Props {
  rows: { name: string; value: number }[]
  total: number
}

export function SpendingDonut({ rows, total }: Props) {
  const reduced = useReducedMotion()
  if (rows.length === 0) {
    return (
      <p className="text-muted py-6 text-center text-sm">
        Add budget items to see a breakdown.
      </p>
    )
  }
  return (
    <div className="grid items-center gap-4 md:grid-cols-2">
      <div aria-hidden="true" className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
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
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-muted text-xs">Spending</span>
          <strong>{fmt(total)}</strong>
        </div>
      </div>
      <ul className="grid gap-2 text-sm">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center gap-2">
            <i
              aria-hidden="true"
              className="h-3 w-3 rounded-sm"
              style={{ background: palette[i] }}
            />
            <span className="flex-1">{r.name}</span>
            <b>{fmt(r.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
