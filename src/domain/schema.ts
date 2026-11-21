import { z } from 'zod'
import { frequencies, transactionTypes } from './constants'
import { starter } from './starter'
import type { State } from './types'

export const SCHEMA_VERSION = 3

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
  budget: z.array(budgetItem).catch([]),
  transactions: z.array(transaction).catch([]),
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
