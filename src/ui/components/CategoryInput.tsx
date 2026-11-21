import { CategoryIcon } from './CategoryIcon'
import { TextInput } from './TextInput'

/** Free-text category with suggestions (`#category-list`) and a matching icon. */
export function CategoryInput({
  value,
  onChange,
}: {
  value: string
  onChange(v: string): void
}) {
  return (
    <div className="flex items-center gap-2">
      <CategoryIcon name={value} />
      <TextInput
        label="Category"
        list="category-list"
        maxLength={120}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
