import { expect, it } from 'vitest'
import { limitStatus } from './limits'

it('has no status without a limit', () => {
  expect(limitStatus(50, 0)).toBeNull()
  expect(limitStatus(50, -5)).toBeNull()
})
it('flags near at 80% and over only above 100%', () => {
  expect(limitStatus(79, 100)?.level).toBe('ok')
  expect(limitStatus(80, 100)?.level).toBe('near')
  expect(limitStatus(100, 100)?.level).toBe('near')
  expect(limitStatus(100.01, 100)?.level).toBe('over')
  expect(limitStatus(0, 100)?.ratio).toBe(0)
})
