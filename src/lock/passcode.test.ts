import { describe, expect, it } from 'vitest'
import { checkPasscode, makeRecord, parseRecord } from './passcode'

describe('passcode', () => {
  it('accepts the right passcode and rejects others', async () => {
    const r = await makeRecord('1234')
    expect(await checkPasscode('1234', r)).toBe(true)
    expect(await checkPasscode('1235', r)).toBe(false)
    expect(JSON.stringify(r)).not.toContain('1234')
  })
  it('salts: the same passcode gives different records', async () => {
    const [a, b] = [await makeRecord('1234'), await makeRecord('1234')]
    expect(a.hash).not.toBe(b.hash)
  })
  it('treats malformed stored data as no lock', () => {
    expect(parseRecord(null)).toBeNull()
    expect(parseRecord('nope')).toBeNull()
    expect(parseRecord('{"salt":1}')).toBeNull()
    expect(parseRecord('{"salt":"a","hash":"b","iterations":1}')).not.toBeNull()
  })
})
