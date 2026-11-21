import type { InputHTMLAttributes } from 'react'

interface Props extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  label: string
  onChange(value: string): void
}

export function TextInput({ label, onChange, ...rest }: Props) {
  return (
    <input
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="border-line w-full min-w-24 rounded-lg border px-3 py-2"
      {...rest}
    />
  )
}
