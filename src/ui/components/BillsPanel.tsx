import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import type { BillStatus } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { DataTable } from './DataTable'
import { Panel } from './Panel'
import { fmt } from '../format'
import type { useBills } from '../useBills'

const label: Record<BillStatus, string> = {
  paid: 'Paid',
  overdue: 'Overdue',
  soon: 'Due soon',
  upcoming: 'Upcoming',
}
const Icon = {
  paid: CheckCircle2,
  overdue: AlertTriangle,
  soon: Clock,
  upcoming: Clock,
}
const day = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' })
export function BillsPanel({
  bills,
}: {
  bills: NonNullable<ReturnType<typeof useBills>>
}) {
  const month = useLedger((s) => s.state.month)
  const unpaid = bills.filter((b) => b.status !== 'paid').length
  return (
    <Panel
      title="Bills this month"
      subtitle="Mark a bill paid to record its transaction."
      action={
        unpaid > 0 && (
          <button
            className="border-line rounded-lg border px-3 py-2 text-sm font-semibold"
            onClick={() => useLedger.getState().generateRecurring(month)}
          >
            Record all unpaid
          </button>
        )
      }
    >
      <DataTable
        caption="Bills this month"
        headers={['Due', 'Bill', 'Amount', 'Status', '']}
        empty="No bills fall in this month."
        rows={bills.map(({ due, status }) => {
          const I = Icon[status]
          const [y, m, d] = due.date.split('-').map(Number)
          const name = due.rule.name || due.rule.category || 'Unnamed'
          return {
            key: due.rule.id + due.date,
            cells: [
              day.format(new Date(y, m - 1, d)),
              name,
              fmt(Number(due.rule.amount)),
              <span
                className={`flex items-center gap-1 ${status === 'overdue' ? 'text-negative font-semibold' : ''}`}
              >
                <I size={14} aria-hidden="true" />
                {label[status]}
              </span>,
              due.paid ? (
                '—'
              ) : (
                <button
                  className="border-line rounded-lg border px-3 py-1 text-sm font-semibold"
                  onClick={() =>
                    useLedger.getState().generateRecurring(month, {
                      ruleId: due.rule.id,
                      date: due.date,
                    })
                  }
                >
                  Mark paid
                  <span className="sr-only"> {name}</span>
                </button>
              ),
            ],
          }
        })}
      />
    </Panel>
  )
}
