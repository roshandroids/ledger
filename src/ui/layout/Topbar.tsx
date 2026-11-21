import { useTranslation } from '../i18n'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MonthPicker } from '../components/MonthPicker'

interface Props {
  title: string
  month: string
  onMonthChange(month: string): void
  actions?: ReactNode
  showReportControls?: boolean
}

export function Topbar({
  title,
  month,
  onMonthChange,
  actions,
  showReportControls = true,
}: Props) {
  const t = useTranslation()
  return (
    <header className="border-line bg-card flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:px-9 md:py-6">
      <div>
        <Link
          to="/overview"
          aria-label={t('Ledger overview')}
          className="inline-block rounded-md md:hidden"
        >
          <img
            src="/brand/ledger-launcher-192.png"
            alt=""
            width={36}
            height={36}
            className="rounded-md"
          />
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
      </div>
      {showReportControls && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-36 flex-1 md:w-48 md:flex-none">
            <MonthPicker
              label={t('Report month')}
              value={month}
              onChange={onMonthChange}
            />
          </div>
          {actions}
        </div>
      )}
    </header>
  )
}
