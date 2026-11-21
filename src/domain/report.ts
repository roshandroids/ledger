import { frequencies, gymOptions } from './constants'
import { baseTransactions } from './currencies'
import type {
  CategoryRow,
  Report,
  State,
  Transaction,
  TransactionType,
  MoneyInput,
  Cadence,
} from './types'

const spendingTypes: TransactionType[] = ['Expense', 'Fund expense']

export const monthKey = (d = new Date()) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')

const cents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100
const money = (value: MoneyInput | undefined) => Number(value) || 0

/** Average monthly cost of a gym option including 13% HST (26 biweekly payments + annual fee). */
export const gymMonthly = (item: { rate: number; fee: number }) =>
  (cents(item.rate * 1.13) * 26 + cents(item.fee * 1.13)) / 12

export const monthly = (
  amount: MoneyInput,
  cadence: Cadence,
  due: string,
  month: string,
) =>
  cadence === 'One-time'
    ? due === month
      ? money(amount)
      : 0
    : (money(amount) * (frequencies[cadence] || 0)) / 12

const categoryName = (value: string) => value.trim() || 'Uncategorized'

const isValid = (row: Transaction) =>
  /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
  row.amount !== '' &&
  Number.isFinite(Number(row.amount))

/**
 * Category parts of a transaction: each split, then the remainder under the
 * row's own category. Splits that are invalid or exceed the amount are ignored.
 */
export function splitParts(
  row: Transaction,
): { category: string; amount: number }[] {
  const total = money(row.amount)
  const parts = (row.splits ?? [])
    .map((s) => ({ category: s.category, amount: money(s.amount) }))
    .filter((s) => s.amount > 0)
  const used = parts.reduce((t, s) => t + s.amount, 0)
  if (!parts.length || used > total + 0.005)
    return [{ category: row.category, amount: total }]
  return [...parts, { category: row.category, amount: total - used }]
}

export function report(state: State): Report {
  const activeGym =
    gymOptions.find((item) => item.id === state.gym) ?? gymOptions[0]
  const gym = gymMonthly(activeGym)
  const budget = state.budget.map((item) => ({
    ...item,
    monthly: monthly(item.amount, item.cadence, item.due, state.month),
  }))
  const valid = baseTransactions(state).filter(isValid)
  const current = valid.filter((row) => row.date.startsWith(state.month + '-'))
  const active = current.length > 0

  const sum = <T extends { type: string }>(
    rows: T[],
    type: string,
    value: (row: T) => number,
  ) =>
    rows
      .filter((row) => row.type === type)
      .reduce((total, row) => total + value(row), 0)
  const amountOf = (row: Transaction) => money(row.amount)
  const monthlyOf = (row: { monthly: number }) => row.monthly
  const movement = (rows: Transaction[]) =>
    sum(rows, 'Savings transfer', amountOf) -
    sum(rows, 'Savings withdrawal', amountOf) -
    sum(rows, 'Fund expense', amountOf)

  const goalRows = state.goals.map((goal) => {
    const net = movement(
      valid.filter(
        (row) => row.goal === goal.id && row.date.slice(0, 7) <= state.month,
      ),
    )
    const balance = money(goal.opening) + net
    return {
      ...goal,
      net,
      balance,
      progress: money(goal.target) > 0 ? balance / money(goal.target) : null,
    }
  })

  const planIncome =
    state.pay === '' ? null : monthly(state.pay, state.cadence, '', state.month)
  const planSpend = sum(budget, 'Expense', monthlyOf) + gym
  const planSaved = sum(budget, 'Savings transfer', monthlyOf)
  const planCash =
    planIncome === null ? null : planIncome - planSpend - planSaved
  const actualIncome = current.some((row) => row.type === 'Income')
    ? sum(current, 'Income', amountOf)
    : null
  const actualSpend =
    sum(current, 'Expense', amountOf) + sum(current, 'Fund expense', amountOf)
  const actualSaved = movement(current)
  const actualCash =
    actualIncome === null ? null : actualIncome - actualSpend - actualSaved
  const general = movement(current.filter((row) => row.goal === 'general'))
  const target = money(state.target)

  // Case-insensitive grouping; first spelling seen wins as the display name.
  const groups = new Map<string, CategoryRow>()
  const add = (key: string, field: 'planned' | 'actual', value: number) => {
    const name = categoryName(key)
    const match = name.toLocaleLowerCase('en-CA')
    if (!groups.has(match)) groups.set(match, { name, planned: 0, actual: 0 })
    groups.get(match)![field] += value
  }
  budget
    .filter((row) => row.type === 'Expense' && (row.name || row.amount !== ''))
    .forEach((row) => add(row.category, 'planned', row.monthly))
  if (gym) add('Fitness', 'planned', gym)
  current
    .filter((row) => spendingTypes.includes(row.type))
    .forEach((row) => {
      const parts = splitParts(row)
      parts.forEach((p) => add(p.category, 'actual', p.amount))
    })
  const breakdown = [...groups.values()].sort(
    (a, b) =>
      b.planned - a.planned ||
      b.actual - a.actual ||
      a.name.localeCompare(b.name),
  )

  return {
    activeGym,
    gym,
    budget,
    goalRows,
    breakdown,
    target,
    active,
    currentCount: current.length,
    planIncome,
    planSpend,
    planSaved,
    planCash,
    actualIncome,
    actualSpend,
    actualSaved,
    actualCash,
    general,
    planRate:
      planIncome !== null && planIncome > 0 ? planSaved / planIncome : null,
    actualRate:
      actualIncome !== null && actualIncome > 0
        ? actualSaved / actualIncome
        : null,
    afterTarget: planCash === null ? null : planCash - target,
    leftToSave: Math.max(0, target - general),
  }
}
