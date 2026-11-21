import { expect, it } from 'vitest'
import { ringRows } from './chartData'

it('keeps top 7 and folds the rest, dropping zero-plan rows', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({
    name: `c${i}`,
    planned: 10 - i,
    actual: 0,
  }))
  rows.push({ name: 'zero', planned: 0, actual: 5 })
  const out = ringRows(rows)
  expect(out).toHaveLength(8)
  expect(out[7]).toEqual({ name: 'All other categories', value: 3 + 2 + 1 })
  expect(out.some((r) => r.name === 'zero')).toBe(false)
})

it('is empty with no planned spend', () => {
  expect(ringRows([{ name: 'a', planned: 0, actual: 3 }])).toEqual([])
})

import { categoryIcon } from './categoryIcons'
import { defaultCategories } from '../domain'

it('every default category has its own icon; unknown names fall back', () => {
  const fallback = categoryIcon('zzz unknown')
  for (const c of defaultCategories.filter((c) => c !== 'Other')) {
    expect(categoryIcon(c), c).not.toBe(fallback)
  }
  expect(categoryIcon('  GROCERIES ')).toBe(categoryIcon('Groceries'))
})
