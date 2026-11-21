import { beforeEach, describe, expect, it } from 'vitest'
import { starter } from '../domain'
import { CORRUPT_KEY, V1_KEY, V2_KEY, createLocalStorage } from './localStorage'

beforeEach(() => localStorage.clear())

describe('localStorage adapter', () => {
  it('returns the starter state when empty', () => {
    const r = createLocalStorage().load()
    expect(r.canSave).toBe(true)
    expect(r.state.budget.length).toBe(8)
  })

  it('round-trips a v2 save', () => {
    const s = createLocalStorage()
    const state = { ...starter(false), pay: 3000, month: '2026-03' }
    expect(s.save(state)).toBe(true)
    expect(s.load().state).toEqual(state)
  })

  it('migrates a v1 blob without data loss and keeps v1', () => {
    // A real v1 blob has no `rollover` key.
    const { rollover: _omit, ...base } = starter(false)
    const v1 = {
      ...base,
      month: '2026-02',
      pay: '2500',
      gym: 'fit',
      transactions: [
        {
          date: '2026-02-03',
          type: 'Income',
          category: '',
          amount: '2500',
          goal: '',
          notes: 'pay',
        },
      ],
      goals: [
        { id: 'general', name: 'General savings', target: '', opening: '10' },
        { id: 'g2', name: 'Trip', target: '900', opening: '' },
      ],
    }
    localStorage.setItem(V1_KEY, JSON.stringify(v1))
    const { state } = createLocalStorage().load()
    expect(state).toEqual({ ...v1, rollover: false })
    expect(localStorage.getItem(V1_KEY)).toBe(JSON.stringify(v1))
    expect(localStorage.getItem(V2_KEY)).not.toBeNull()
  })

  it('adds the general goal when a stored blob lacks it', () => {
    localStorage.setItem(
      V1_KEY,
      JSON.stringify({ ...starter(false), goals: [] }),
    )
    expect(createLocalStorage().load().state.goals[0].id).toBe('general')
  })

  it('falls back to starter on corrupt JSON and backs the blob up', () => {
    localStorage.setItem(V2_KEY, '{nope')
    const r = createLocalStorage().load()
    expect(r.state.sample).toBe(true)
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{nope')
  })

  it('reports canSave=false when storage throws on read', () => {
    const bad = {
      getItem: () => {
        throw new Error('x')
      },
    } as unknown as Storage
    expect(createLocalStorage(bad).load().canSave).toBe(false)
  })

  it('save returns false when storage throws', () => {
    const bad = {
      setItem: () => {
        throw new Error('quota')
      },
    } as unknown as Storage
    expect(createLocalStorage(bad).save(starter())).toBe(false)
  })
})
