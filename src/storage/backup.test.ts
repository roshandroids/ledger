import { expect, it } from 'vitest'
import { starter } from '../domain'
import { parseBackup, serializeBackup } from './backup'

it('round-trips a backup', () => {
  const s = { ...starter(false), pay: 123, month: '2026-04' }
  expect(parseBackup(serializeBackup(s))).toEqual(s)
})

it('accepts a bare v1 state and rejects junk', () => {
  expect(parseBackup(JSON.stringify(starter(false)))?.goals[0].id).toBe(
    'general',
  )
  expect(parseBackup('not json')).toBeNull()
  expect(parseBackup('42')).toBeNull()
  expect(parseBackup('null')).toBeNull()
})
