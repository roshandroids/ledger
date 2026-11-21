import type { ReactNode } from 'react'

export function Notice({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      role="status"
      className="border-line flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 text-sm"
    >
      <span>{children}</span>
      {action}
    </div>
  )
}
