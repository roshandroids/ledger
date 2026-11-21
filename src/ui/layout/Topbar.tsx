import type { ReactNode } from 'react'

interface Props {
  title: string
  month: string
  onMonthChange(month: string): void
  actions?: ReactNode
}

export function Topbar({ title, month, onMonthChange, actions }: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-white px-6 py-6 md:px-9">
      <div>
        <span className="text-muted text-xs font-bold tracking-widest">
          PERSONAL FINANCE
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="month"
          aria-label="Report month"
          value={month}
          onChange={(e) => e.target.value && onMonthChange(e.target.value)}
          className="border-line rounded-lg border px-3 py-2"
        />
        {actions}
      </div>
    </header>
  )
}
