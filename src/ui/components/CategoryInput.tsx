import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { defaultCategories } from '../../domain'
import { CategoryIcon } from './CategoryIcon'
import { panelClass } from './popover'

/** Searchable category suggestions with support for custom names. */
export function CategoryInput({
  label = 'Category',
  extra = [],
  value,
  onChange,
}: {
  label?: string
  extra?: readonly string[]
  value: string
  onChange(v: string): void
}) {
  const [query, setQuery] = useState('')
  const search = query.trim().toLocaleLowerCase('en-CA')
  const options = [
    ...new Set([
      ...defaultCategories,
      ...extra.filter((name) => name && name !== query),
    ]),
  ].filter((name) => name.toLocaleLowerCase('en-CA').includes(search))

  return (
    <div className="flex w-full min-w-24 items-center gap-2">
      <CategoryIcon name={value} />
      <Combobox
        value={value}
        onChange={(name) => onChange(name ?? '')}
        onClose={() => setQuery('')}
      >
        <div className="relative min-w-0 flex-1">
          <ComboboxInput
            aria-label={label}
            placeholder="Search categories"
            maxLength={120}
            className="border-line w-full rounded-lg border py-2 pr-10 pl-3"
            onChange={(event) => {
              const name = event.target.value
              setQuery(name)
              onChange(name)
            }}
          />
          <ComboboxButton
            aria-label={`Show ${label.toLowerCase()} suggestions`}
            className="text-muted absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3"
          >
            <ChevronDown size={16} aria-hidden="true" />
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          modal={false}
          className={`${panelClass} [--anchor-max-height:12rem] w-[var(--input-width)] min-w-36 overflow-y-auto p-1 empty:invisible`}
        >
          {options.map((name) => (
            <ComboboxOption
              key={name}
              value={name}
              className="data-[focus]:bg-surface data-[selected]:font-semibold flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
            >
              <CategoryIcon name={name} />
              {name}
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>
    </div>
  )
}
