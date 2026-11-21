import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { panelClass, triggerClass } from './popover'

const names = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('en-CA', { month: 'short' }).format(
    new Date(2000, i, 1),
  ),
)
const long = new Intl.DateTimeFormat('en-CA', {
  month: 'long',
  year: 'numeric',
})
const MONTH = /^(\d{4})-(\d{2})$/

function parse(value: string) {
  const m = MONTH.exec(value)
  return m && +m[2] >= 1 && +m[2] <= 12 ? { year: +m[1], month: +m[2] } : null
}

function Grid({
  value,
  onPick,
}: {
  value: ReturnType<typeof parse>
  onPick(month: string): void
}) {
  const [year, setYear] = useState(
    () => value?.year ?? new Date().getFullYear(),
  )
  const nav = 'hover:bg-surface grid h-8 w-8 place-content-center rounded-lg'
  return (
    <div className="w-60">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous year"
          className={nav}
          onClick={() => setYear(year - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <strong aria-live="polite">{year}</strong>
        <button
          type="button"
          aria-label="Next year"
          className={nav}
          onClick={() => setYear(year + 1)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {names.map((n, i) => {
          const selected = value?.year === year && value.month === i + 1
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onPick(`${year}-${String(i + 1).padStart(2, '0')}`)
              }
              className={`rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${selected ? 'bg-nav text-white' : 'hover:bg-surface'}`}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MonthPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange(month: string): void
}) {
  const parsed = parse(value)
  return (
    <Popover>
      <PopoverButton aria-label={label} className={triggerClass}>
        <span className="truncate">
          {parsed
            ? long.format(new Date(parsed.year, parsed.month - 1, 1))
            : value || 'Pick a month'}
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
        className={`${panelClass} p-3`}
      >
        {({ close }) => (
          <Grid
            value={parsed}
            onPick={(m) => {
              onChange(m)
              close()
            }}
          />
        )}
      </PopoverPanel>
    </Popover>
  )
}
