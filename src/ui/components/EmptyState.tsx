import type { ReactNode } from 'react'

/** Illustrates an empty panel and displays its next step. */
export function EmptyState({
  children,
  illustration = '/brand/monthly-budget.webp',
}: {
  children: ReactNode
  illustration?: string
}) {
  return (
    <div className="grid justify-items-center gap-3 py-8 text-center">
      <img src={illustration} alt="" width={144} className="h-auto" />
      <p className="text-muted max-w-xs text-sm">{children}</p>
    </div>
  )
}
