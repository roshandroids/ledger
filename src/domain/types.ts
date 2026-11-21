export type Cadence =
  | 'Weekly'
  | 'Biweekly'
  | 'Twice monthly'
  | 'Monthly'
  | 'Quarterly'
  | 'Annual'
  | 'One-time'
export type BudgetType = 'Expense' | 'Savings transfer'
export type TransactionType =
  | 'Income'
  | 'Expense'
  | 'Savings transfer'
  | 'Savings withdrawal'
  | 'Fund expense'
export type GymId = 'none' | 'fit' | 'good'

/** Form values stay strings (or '') so half-typed input round-trips through storage. */
export type MoneyInput = string | number

export interface BudgetItem {
  name: string
  category: string
  type: BudgetType
  cadence: Cadence
  amount: MoneyInput
  /** `YYYY-MM`; only used when cadence is One-time. */
  due: string
}

export interface Transaction {
  /** `YYYY-MM-DD`; rows with any other format are ignored by calculations. */
  date: string
  type: TransactionType
  category: string
  amount: MoneyInput
  /** Goal id; only meaningful for savings-related types. */
  goal: string
  notes: string
  /** Set when generated from a recurring rule; makes generation idempotent. */
  ruleId?: string
}

export interface Recurring {
  id: string
  name: string
  category: string
  type: Extract<TransactionType, 'Income' | 'Expense' | 'Savings transfer'>
  cadence: Exclude<Cadence, 'One-time'>
  amount: MoneyInput
  /** First occurrence, `YYYY-MM-DD`; later dates follow the cadence from here. */
  start: string
  /** Goal id for Savings transfer; empty means the general goal. */
  goal: string
}

export interface Goal {
  id: string
  name: string
  target: MoneyInput
  opening: MoneyInput
}

export interface State {
  sample: boolean
  /** Selected report month, `YYYY-MM`. */
  month: string
  pay: MoneyInput
  cadence: Cadence
  target: MoneyInput
  gym: GymId
  /** Carry unspent category budget into the next month. */
  rollover: boolean
  budget: BudgetItem[]
  transactions: Transaction[]
  recurring: Recurring[]
  goals: Goal[]
}

export interface GymOption {
  id: GymId
  name: string
  rate: number
  fee: number
}

export interface BudgetRow extends BudgetItem {
  monthly: number
}

export interface GoalRow extends Goal {
  net: number
  balance: number
  progress: number | null
}

export interface CategoryRow {
  name: string
  planned: number
  actual: number
}

export interface Report {
  activeGym: GymOption
  gym: number
  budget: BudgetRow[]
  goalRows: GoalRow[]
  breakdown: CategoryRow[]
  target: number
  active: boolean
  currentCount: number
  planIncome: number | null
  planSpend: number
  planSaved: number
  planCash: number | null
  actualIncome: number | null
  actualSpend: number
  actualSaved: number
  actualCash: number | null
  general: number
  planRate: number | null
  actualRate: number | null
  afterTarget: number | null
  leftToSave: number
}
