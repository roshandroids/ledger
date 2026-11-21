import { z } from 'zod'
import { frequencies, transactionTypes } from './constants'
import { currencies } from './currencies'
import { starter } from './starter'
import type { State } from './types'

export const SCHEMA_VERSION = 7

const money = z.union([z.string(), z.number()])
const cadence = z.enum(Object.keys(frequencies) as [string, ...string[]])
const text = z.string().catch('')

const budgetItem = z.object({
  name: text,
  category: text,
  type: z.enum(['Expense', 'Savings transfer']).catch('Expense'),
  cadence: cadence.catch('Monthly'),
  amount: money.catch(''),
  due: text,
})

const transaction = z.object({
  date: text,
  type: z.enum(transactionTypes as [string, ...string[]]).catch('Expense'),
  category: text,
  amount: money.catch(''),
  goal: text,
  notes: text,
  ruleId: z.string().optional().catch(undefined),
  account: z.string().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  splits: z
    .array(z.object({ category: text, amount: money.catch('') }))
    .optional()
    .catch(undefined),
})

const account = z.object({
  id: z.string().min(1),
  name: text,
  kind: z
    .enum(['Chequing', 'Savings', 'Investment', 'Credit card', 'Loan'])
    .catch('Chequing'),
  opening: money.catch(''),
  rate: money.catch(''),
  payment: money.catch(''),
})

const transfer = z.object({
  id: z.string().min(1),
  date: text,
  from: text,
  to: text,
  amount: money.catch(''),
  notes: text,
})

const recurring = z.object({
  id: z.string().min(1),
  name: text,
  category: text,
  type: z.enum(['Income', 'Expense', 'Savings transfer']).catch('Expense'),
  cadence: z
    .enum([
      'Weekly',
      'Biweekly',
      'Twice monthly',
      'Monthly',
      'Quarterly',
      'Annual',
    ])
    .catch('Monthly'),
  amount: money.catch(''),
  start: text,
  goal: text,
})

const goal = z.object({
  id: z.string().min(1),
  name: text,
  target: money.catch(''),
  opening: money.catch(''),
})

const stateSchema = z.object({
  sample: z.boolean().catch(false),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .catch(starter().month),
  pay: money.catch(''),
  cadence: cadence.catch('Biweekly'),
  target: money.catch(''),
  gym: z.enum(['none', 'fit', 'good']).catch('none'),
  rollover: z.boolean().catch(false),
  currency: z
    .enum(currencies.map((c) => c.code) as [string, ...string[]])
    .catch('CAD'),
  budget: z.array(budgetItem).catch([]),
  transactions: z.array(transaction).catch([]),
  recurring: z.array(recurring).catch([]),
  accounts: z.array(account).catch([]),
  transfers: z.array(transfer).catch([]),
  goals: z.array(goal).catch([]),
})

/**
 * Parse an unknown blob (a v1 state, or the `state` of a v2 envelope) into a
 * valid State. Returns null when it is not an object at all. The `general`
 * goal is always present.
 */
export function parseState(raw: unknown): State | null {
  const parsed = stateSchema.safeParse(raw)
  if (!parsed.success) return null
  const state = parsed.data as State
  if (!state.goals.some((g) => g.id === 'general')) {
    state.goals.unshift(starter().goals[0])
  }
  return state
}
