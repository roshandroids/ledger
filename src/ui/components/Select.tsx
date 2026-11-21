import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react'
import { Check, ChevronDown } from 'lucide-react'
import { panelClass, triggerClass } from './popover'

interface Props {
  label: string
  value: string
  options: readonly (string | readonly [value: string, label: string])[]
  onChange(value: string): void
}

/** Accessible custom dropdown. `label` is the button's aria-label. */
export function Select({ label, value, options, onChange }: Props) {
  const items = options.map((o) =>
    typeof o === 'string' ? ([o, o] as const) : o,
  )
  const current = items.find(([v]) => v === value)
  return (
    <Listbox value={value} onChange={onChange}>
      <ListboxButton aria-label={label} className={triggerClass}>
        <span className="truncate">{current?.[1] ?? value}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="text-muted shrink-0"
        />
      </ListboxButton>
      <ListboxOptions
        anchor="bottom start"
        transition
        className={`${panelClass} w-[var(--button-width)] min-w-44 p-1 focus:outline-none`}
      >
        {items.map(([v, text]) => (
          <ListboxOption
            key={v}
            value={v}
            className="data-[focus]:bg-surface flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
          >
            {text}
            {v === value && (
              <Check size={14} aria-hidden="true" className="text-teal" />
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}
