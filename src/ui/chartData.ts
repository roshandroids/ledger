import type { CategoryRow } from '../domain'

import { displayLocale } from './preferences'

export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat(displayLocale(), {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(month + '-01T00:00:00Z'))

export const palette = [
  '#079777',
  '#8153e6',
  '#e88b36',
  '#cd5596',
  '#349ec9',
  '#ed626a',
  '#87a527',
  '#8e82aa',
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
