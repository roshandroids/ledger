import type { SelectHTMLAttributes } from 'react'

interface Props extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'onChange'
> {
  label: string
  options: readonly (string | readonly [value: string, label: string])[]
  onChange(value: string): void
}

/** `label` becomes the aria-label; every control must have one. */
export function Select({ label, options, onChange, ...rest }: Props) {
  return (
    <select
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="border-line w-full rounded-lg border bg-card px-3 py-2"
      {...rest}
    >
      {options.map((o) => {
        const [value, text] = typeof o === 'string' ? [o, o] : o
        return (
          <option key={value} value={value}>
            {text}
          </option>
        )
      })}
    </select>
  )
}
