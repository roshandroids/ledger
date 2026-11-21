import type { Cadence, GymOption, TransactionType } from './types'

/** Payments per year; One-time is handled separately by `monthly()`. */
export const frequencies: Record<Cadence, number> = {
  Weekly: 52,
  Biweekly: 26,
  'Twice monthly': 24,
  Monthly: 12,
  Quarterly: 4,
  Annual: 1,
  'One-time': 0,
}

export const gymOptions: GymOption[] = [
  { id: 'none', name: 'Neither', rate: 0, fee: 0 },
  { id: 'fit', name: 'Fit4Less Black', rate: 13.99, fee: 49.99 },
  { id: 'good', name: 'GoodLife Corporate Premium', rate: 30.74, fee: 0 },
]

export const transactionTypes: TransactionType[] = [
  'Income',
  'Expense',
  'Savings transfer',
  'Savings withdrawal',
  'Fund expense',
]

/** Types that move money in or out of a savings goal. */
export const goalTypes: TransactionType[] = [
  'Savings transfer',
  'Savings withdrawal',
  'Fund expense',
]
