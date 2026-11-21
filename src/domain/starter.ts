import { monthKey } from './report'
import type { BudgetType, State } from './types'

const sampleBudget: [string, string, number, BudgetType?][] = [
  ['Rent & utilities', 'Housing', 1190],
  ['Auto insurance', 'Transportation', 188],
  ['Fuel & transit', 'Transportation', 120],
  ['Groceries', 'Groceries', 325],
  ['Phone plan', 'Phone', 55],
  ['Dining out', 'Food & drink', 155],
  ['Subscriptions', 'Personal', 42],
  ['Vehicle reserve', 'Transportation', 75, 'Savings transfer'],
]

/** Starting state: the sample budget, or an empty one. */
export function starter(sample = true): State {
  return {
    sample,
    month: monthKey(),
    pay: sample ? 2200 : '',
    cadence: 'Biweekly',
    target: sample ? 1500 : '',
    gym: 'none',
    rollover: false,
    budget: (sample ? sampleBudget : []).map(
      ([name, category, amount, type = 'Expense']) => ({
        name,
        category,
        amount,
        type,
        cadence: 'Monthly',
        due: '',
      }),
    ),
    transactions: [],
    recurring: [],
    accounts: [],
    transfers: [],
    goals: [
      { id: 'general', name: 'General savings', target: '', opening: '' },
    ],
  }
}
