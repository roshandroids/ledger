import type { InputHTMLAttributes } from 'react'

interface Props extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  label: string
  value: string | number
  onChange(value: string): void
  allowNegative?: boolean
}

/**
 * Number input that ignores in-progress invalid input (`badInput`,
 * `stepMismatch`, `rangeUnderflow`) instead of saving it, as the legacy app did.
 */
export function MoneyInput({
  label,
  value,
  onChange,
  allowNegative = false,
  ...rest
}: Props) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min={allowNegative ? undefined : 0}
      aria-label={label}
      value={value}
      onChange={(e) => {
        const { validity } = e.target
        if (
          validity.badInput ||
          validity.stepMismatch ||
          validity.rangeUnderflow
        )
          return
        onChange(e.target.value)
      }}
      className="border-line w-full rounded-lg border px-3 py-2"
      {...rest}
    />
  )
}
