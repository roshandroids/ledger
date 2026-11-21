import type { ReactNode } from 'react'
import { ThemeToggle } from '../ThemeToggle'

interface Props {
  title: string
  month: string
  onMonthChange(month: string): void
  actions?: ReactNode
}

export function Topbar({ title, month, onMonthChange, actions }: Props) {
  return (
    <header className="border-line bg-card flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:px-9 md:py-6">
      <div>
        <span className="text-muted text-xs font-bold tracking-widest">
          PERSONAL FINANCE
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="month"
          aria-label="Report month"
          value={month}
          onChange={(e) => e.target.value && onMonthChange(e.target.value)}
          className="border-line min-w-0 flex-1 rounded-lg border px-3 py-2 md:flex-none"
        />
        {actions}
        <ThemeToggle />
      </div>
    </header>
  )
}
