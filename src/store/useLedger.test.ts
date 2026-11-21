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

  it('bulk-removes and re-categorizes the chosen transactions only', () => {
    const { store } = memory(starter(false))
    for (let i = 0; i < 4; i++) store.getState().addRow('transactions')
    store.getState().recategorize([1, 3], 'Gifts')
    expect(store.getState().state.transactions.map((t) => t.category)).toEqual([
      '',
      'Gifts',
      '',
      'Gifts',
    ])
    store.getState().removeTransactions([0, 1])
    expect(store.getState().state.transactions.map((t) => t.category)).toEqual([
      '',
      'Gifts',
    ])
  })

  it('generates a month of recurring transactions once, or one occurrence', () => {
    const { store } = memory({ ...starter(false), month: '2026-03' })
    store.getState().addRow('recurring')
    const id = store.getState().state.recurring[0].id
    store.getState().updateRow('recurring', 0, {
      name: 'Gym',
      amount: 20,
      cadence: 'Weekly',
      start: '2026-03-02',
    })
    expect(
      store
        .getState()
        .generateRecurring('2026-03', { ruleId: id, date: '2026-03-09' }),
    ).toBe(1)
    expect(store.getState().generateRecurring('2026-03')).toBe(4)
    expect(store.getState().generateRecurring('2026-03')).toBe(0)
    expect(store.getState().state.transactions).toHaveLength(5)
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
