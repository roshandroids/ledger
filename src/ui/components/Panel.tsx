import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function Panel({ title, subtitle, action, children }: Props) {
  return (
    <section className="border-line rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
