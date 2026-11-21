import { defaultCategories } from '../../domain'

export function CategoryDatalist({ extra }: { extra: string[] }) {
  const names = [...new Set([...defaultCategories, ...extra.filter(Boolean)])]
  return (
    <datalist id="category-list">
      {names.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  )
}
