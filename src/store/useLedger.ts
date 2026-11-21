import { create } from 'zustand'
import {
  currencyOf,
  dueInMonth,
  rateFor,
  unspentToSave,
  occurrences,
  starter,
  transactionFor,
  type BudgetItem,
  type Account,
  type Goal,
  type Transfer,
  type Recurring,
  type State,
  type Transaction,
} from '../domain'
import { createLocalStorage } from '../storage/localStorage'
import type { Storage } from '../storage/Storage'

export type Group =
  'budget' | 'transactions' | 'goals' | 'recurring' | 'accounts' | 'transfers'
type Row = {
  budget: BudgetItem
  transactions: Transaction
  goals: Goal
  recurring: Recurring
  accounts: Account
  transfers: Transfer
}
type SettingKey =
  | 'pay'
  | 'cadence'
  | 'target'
  | 'gym'
  | 'month'
  | 'rollover'
  | 'currency'
  | 'rates'

export interface LedgerStore {
  state: State
  canSave: boolean
  setSetting<K extends SettingKey>(key: K, value: State[K]): void
  addRow(group: Group): void
  /** Record a completed month’s available budget leftover as General savings. */
  saveUnspentBudget(month: string, amount: number): boolean
  /** Move a repeating item to the bill schedule while keeping its monthly plan. */
  moveBudgetToRecurring(index: number, start: string): boolean
  updateRow<G extends Group>(
    group: G,
    index: number,
    patch: Partial<Row[G]>,
  ): void
  /** Returns false (and changes nothing) when a goal or account is still referenced. */
  removeRow(group: Group, index: number): boolean
  /** Delete several transactions at once (indexes into state.transactions). */
  removeTransactions(indexes: number[]): void
  /** Set one category on several transactions at once. */
  recategorize(indexes: number[], category: string): void
  /**
   * Create the transactions for a month's recurring bills that have none yet.
   * `only` limits it to one occurrence. Returns how many were added.
   */
  generateRecurring(
    month: string,
    only?: { ruleId: string; date: string },
  ): number
  /** Append already-validated transactions (CSV import). */
  addTransactions(rows: Transaction[]): void
  startBlank(): void
  /** Replace everything (restore from backup). */
  replaceState(state: State): void
}

const newRow = (group: Group, month: string): Row[Group] =>
  (
    ({
      budget: {
        name: '',
        category: '',
        type: 'Expense',
        cadence: 'Monthly',
        amount: '',
        due: month,
      },
      transactions: {
        date: month + '-01',
        type: 'Expense',
        category: '',
        amount: '',
        goal: '',
        notes: '',
      },
      goals: { id: crypto.randomUUID(), name: '', target: '', opening: '' },
      accounts: {
        id: crypto.randomUUID(),
        name: '',
        kind: 'Chequing',
        opening: '',
        rate: '',
        payment: '',
      },
      transfers: {
        id: crypto.randomUUID(),
        date: month + '-01',
        from: '',
        to: '',
        amount: '',
        notes: '',
      },
      recurring: {
        id: crypto.randomUUID(),
        name: '',
        category: '',
        type: 'Expense',
        cadence: 'Monthly',
        amount: '',
        start: month + '-01',
        goal: '',
      },
    }) satisfies Row
  )[group]

export function createLedgerStore(storage: Storage = createLocalStorage()) {
  const initial = storage.load()
  return create<LedgerStore>((set, get) => {
    /** Apply an edit: clears the sample banner and persists. */
    const commit = (next: State) => {
      const state = { ...next, sample: false }
      set({ state, canSave: storage.save(state) })
    }
    return {
      state: initial.state,
      canSave: initial.canSave,
      setSetting(key, value) {
        commit({ ...get().state, [key]: value })
      },
      saveUnspentBudget(month, amount) {
        const s = get().state
        if (month !== s.month || amount <= 0 || unspentToSave(s) !== amount)
          return false
        const lastDay = new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5)),
          0,
        ).getDate()
        const transaction: Transaction = {
          date: `${month}-${lastDay}`,
          type: 'Savings transfer',
          category: 'Savings',
          amount: amount / rateFor(s, currencyOf(s)),
          goal: 'general',
          notes: 'Unspent monthly budget',
          budgetSavingsMonth: month,
        }
        commit({ ...s, transactions: [...s.transactions, transaction] })
        return true
      },
      addRow(group) {
        const s = get().state
        commit({ ...s, [group]: [...s[group], newRow(group, s.month)] })
      },
      moveBudgetToRecurring(index, start) {
        const s = get().state
        const item = s.budget[index]
        if (
          !item ||
          item.cadence === 'One-time' ||
          item.amount === '' ||
          !Number.isFinite(Number(item.amount))
        )
          return false
        const { name, category, type, amount, cadence } = item
        const rule: Recurring = {
          id: crypto.randomUUID(),
          name,
          category,
          type,
          amount,
          cadence,
          start,
          goal: '',
          includeInPlan: true,
        }
        if (!occurrences(rule, start.slice(0, 7)).includes(start)) return false
        commit({
          ...s,
          budget: s.budget.filter((_, i) => i !== index),
          recurring: [...s.recurring, rule],
        })
        return true
      },
      updateRow(group, index, patch) {
        const s = get().state
        const rows = (s[group] as Row[Group][]).map((row, i) => {
          if (i !== index) return row
          const next = { ...row, ...patch } as Row[Group]
          if (group === 'transactions') {
            const tx = next as Transaction
            if (tx.type === 'Income' || tx.type === 'Expense') tx.goal = ''
          }
          return next
        })
        commit({ ...s, [group]: rows })
      },
      removeRow(group, index) {
        const s = get().state
        if (group === 'goals') {
          const id = s.goals[index]?.id
          if (id === 'general' || s.transactions.some((t) => t.goal === id))
            return false
        }
        if (group === 'accounts') {
          const id = s.accounts[index]?.id
          if (
            s.transactions.some((t) => t.account === id) ||
            s.transfers.some((x) => x.from === id || x.to === id)
          )
            return false
        }
        commit({ ...s, [group]: s[group].filter((_, i) => i !== index) })
        return true
      },
      removeTransactions(indexes) {
        const s = get().state
        const drop = new Set(indexes)
        commit({
          ...s,
          transactions: s.transactions.filter((_, i) => !drop.has(i)),
        })
      },
      recategorize(indexes, category) {
        const s = get().state
        const pick = new Set(indexes)
        commit({
          ...s,
          transactions: s.transactions.map((t, i) =>
            pick.has(i) ? { ...t, category } : t,
          ),
        })
      },
      generateRecurring(month, only) {
        const s = get().state
        const todo = dueInMonth(s, month).filter(
          (d) =>
            !d.paid &&
            (!only || (d.rule.id === only.ruleId && d.date === only.date)),
        )
        if (todo.length === 0) return 0
        commit({
          ...s,
          transactions: [
            ...s.transactions,
            ...todo.map((d) => transactionFor(d.rule, d.date)),
          ],
        })
        return todo.length
      },
      addTransactions(rows) {
        const s = get().state
        if (rows.length)
          commit({ ...s, transactions: [...s.transactions, ...rows] })
      },
      replaceState(state) {
        commit(state)
      },
      startBlank() {
        commit({ ...starter(false), month: get().state.month })
      },
    }
  })
}

export const useLedger = createLedgerStore()
