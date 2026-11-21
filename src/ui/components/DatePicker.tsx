import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CalendarDays } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
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
const show = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' })

export function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange(iso: string): void
}) {
  const date = parse(value)
  return (
    <Popover>
      <PopoverButton aria-label={label} className={triggerClass}>
        <span className="truncate">
          {date ? show.format(date) : value || 'Pick a date'}
        </span>
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
