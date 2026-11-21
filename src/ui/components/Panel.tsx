import { useTranslation } from '../i18n'
import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function Panel({ title, subtitle, action, children }: Props) {
  const t = useTranslation()
  return (
    <section className="border-line min-w-0 rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t(title)}</h2>
          {subtitle && <p className="text-muted text-sm">{t(subtitle)}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
