import { describe, expect, it } from 'vitest'
import { starter, type State } from '../domain'
import type { Storage } from '../storage/Storage'
import { createLedgerStore } from './useLedger'

function memory(state: State = starter()) {
  const saved: State[] = []
  const storage: Storage = {
    load: () => ({ state, canSave: true }),
    save: (s) => (saved.push(s), true),
  }
  return { store: createLedgerStore(storage), saved }
}

describe('ledger store', () => {
  it('editing clears the sample flag and persists', () => {
    const { store, saved } = memory()
    store.getState().setSetting('pay', 3000)
    expect(store.getState().state.sample).toBe(false)
    expect(saved.at(-1)?.pay).toBe(3000)
  })

  it('adds rows with the selected month', () => {
    const { store } = memory({ ...starter(false), month: '2026-05' })
    store.getState().addRow('transactions')
    store.getState().addRow('budget')
    const s = store.getState().state
    expect(s.transactions[0].date).toBe('2026-05-01')
    expect(s.budget[0].due).toBe('2026-05')
  })

  it('updates and removes rows', () => {
    const { store } = memory(starter(false))
    store.getState().addRow('budget')
    store.getState().updateRow('budget', 0, { name: 'Rent' })
    expect(store.getState().state.budget[0].name).toBe('Rent')
    expect(store.getState().removeRow('budget', 0)).toBe(true)
    expect(store.getState().state.budget).toHaveLength(0)
  })

  it('type change to Income or Expense clears the goal', () => {
    const { store } = memory(starter(false))
    store.getState().addRow('transactions')
    store.getState().updateRow('transactions', 0, {
      type: 'Savings transfer',
      goal: 'general',
    })
    expect(store.getState().state.transactions[0].goal).toBe('general')
    store.getState().updateRow('transactions', 0, { type: 'Income' })
    expect(store.getState().state.transactions[0].goal).toBe('')
  })

  it('blocks removing a goal with linked transactions, and the general goal', () => {
    const { store } = memory(starter(false))
    store.getState().addRow('goals')
    const id = store.getState().state.goals[1].id
    store.getState().addRow('transactions')
    store
      .getState()
      .updateRow('transactions', 0, { type: 'Savings transfer', goal: id })
    expect(store.getState().removeRow('goals', 1)).toBe(false)
    expect(store.getState().removeRow('goals', 0)).toBe(false)
    store.getState().updateRow('transactions', 0, { goal: 'general' })
    expect(store.getState().removeRow('goals', 1)).toBe(true)
  })

  it('startBlank keeps the month', () => {
    const { store } = memory({ ...starter(), month: '2026-09' })
    store.getState().startBlank()
    const s = store.getState().state
    expect(s.month).toBe('2026-09')
    expect(s.budget).toHaveLength(0)
    expect(s.sample).toBe(false)
  })

  it('canSave turns false when a save fails', () => {
    const storage: Storage = {
      load: () => ({ state: starter(), canSave: true }),
      save: () => false,
    }
    const store = createLedgerStore(storage)
    store.getState().setSetting('pay', 1)
    expect(store.getState().canSave).toBe(false)
  })
})
