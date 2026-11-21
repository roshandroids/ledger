import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CalendarDays } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { ar, es, frCA, ja } from 'react-day-picker/locale'
import { useTranslation } from '../i18n'
import { displayLocale } from '../preferences'
import 'react-day-picker/style.css'
import { panelClass, triggerClass } from './popover'

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** Local-time date; null for anything that is not a real calendar day. */
function parse(value: string): Date | null {
  const m = ISO.exec(value)
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return toIso(d) === value ? d : null
}

export function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange(iso: string): void
}) {
  const t = useTranslation()
  const locale = displayLocale()
  const show = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const calendarLocale =
    locale === 'en-CA' || locale === 'ne-NP'
      ? undefined
      : { 'fr-CA': frCA, es, 'ja-JP': ja, 'ar-u-ca-gregory': ar }[locale]
  const localizedNepali =
    locale === 'ne-NP'
      ? {
          formatCaption: (date: Date) =>
            new Intl.DateTimeFormat(locale, {
              month: 'long',
              year: 'numeric',
            }).format(date),
          formatMonthDropdown: (date: Date) =>
            new Intl.DateTimeFormat(locale, { month: 'long' }).format(date),
          formatWeekdayName: (date: Date) =>
            new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
          formatDay: (date: Date) =>
            new Intl.NumberFormat(locale).format(date.getDate()),
        }
      : undefined
  const date = parse(value)
  const shown = date ? show.format(date) : value || t('Pick a date')
  return (
    <Popover>
      <PopoverButton aria-label={`${label}, ${shown}`} className={triggerClass}>
        <span className="truncate">{shown}</span>
        <CalendarDays
          size={16}
          aria-hidden="true"
          className="text-muted shrink-0"
        />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        transition
        className={`${panelClass} ledger-rdp p-2`}
      >
        {({ close }) => (
          <DayPicker
            mode="single"
            locale={calendarLocale}
            dir={locale.startsWith('ar') ? 'rtl' : 'ltr'}
            formatters={localizedNepali}
            selected={date ?? undefined}
            defaultMonth={date ?? undefined}
            onSelect={(d) => {
              if (d) onChange(toIso(d))
              close()
            }}
            captionLayout="dropdown"
          />
        )}
      </PopoverPanel>
    </Popover>
  )
}
