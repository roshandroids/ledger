import { TextInput } from './TextInput'

/** Comma-separated tags; saved when the field loses focus so typing is never reformatted. */
export function TagsInput({
  value,
  onChange,
}: {
  value: string[] | undefined
  onChange(tags: string[]): void
}) {
  const text = (value ?? []).join(', ')
  return (
    <TextInput
      key={text}
      label="Tags"
      placeholder="trip, work"
      maxLength={200}
      defaultValue={text}
      onChange={() => {}}
      onBlur={(e) =>
        onChange([
          ...new Set(
            e.target.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          ),
        ])
      }
    />
  )
}
