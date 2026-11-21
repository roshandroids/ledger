import type { CategoryRow } from '../domain'

export const palette = [
  '#327b70',
  '#6692d5',
  '#e5aa63',
  '#796bb2',
  '#4291af',
  '#cc8292',
  '#a6b85e',
  '#8d9dae',
]

/** Top 7 planned categories plus an "All other categories" slice; zero-plan rows are dropped. */
export function ringRows(
  breakdown: CategoryRow[],
): { name: string; value: number }[] {
  const positive = breakdown.filter((r) => r.planned > 0)
  const rows = positive
    .slice(0, 7)
    .map((r) => ({ name: r.name, value: r.planned }))
  if (positive.length > 7) {
    rows.push({
      name: 'All other categories',
      value: positive.slice(7).reduce((sum, r) => sum + r.planned, 0),
    })
  }
  return rows
}
