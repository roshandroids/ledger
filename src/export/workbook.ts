import ExcelJS from 'exceljs'
import {
  accountBalances,
  cashFormat,
  frequencies,
  isDebt,
  report,
} from '../domain'
import type { State } from '../domain'

/** Set from the ledger currency at the start of each build (builds are synchronous). */
let CASH = '"$"#,##0.00;("$"#,##0.00)'
const PERCENT = '0.0%'

/** Column keys per sheet, in order. Formulas address cells only through these maps. */
const columns = {
  Budget: [
    'item',
    'category',
    'type',
    'frequency',
    'amount',
    'due',
    'monthly',
    'perYear',
  ],
  Transactions: [
    'date',
    'type',
    'category',
    'amount',
    'goalName',
    'notes',
    'goalId',
    'monthAmount',
    'inMonth',
    'throughMonth',
  ],
  Goals: ['name', 'target', 'opening', 'net', 'balance', 'progress', 'goalId'],
} as const
/** Row keys for the two label/value sheets; row number = index + 1. */
const rows = {
  Overview: [
    'header',
    'month',
    'income',
    'spend',
    'saved',
    'cash',
    'rate',
    'target',
    'after',
    'general',
    'left',
  ],
  Settings: [
    'header',
    'month',
    'pay',
    'cadence',
    'perYear',
    'target',
    'gym',
    'gymChoice',
    'hst',
  ],
} as const

function letter(index: number): string {
  let s = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}
type ColSheet = keyof typeof columns
type RowSheet = keyof typeof rows
/** `Transactions!H:H` */
const colRange = <S extends ColSheet>(
  sheet: S,
  key: (typeof columns)[S][number],
) => {
  const l = letter((columns[sheet] as readonly string[]).indexOf(key))
  return `${sheet}!${l}:${l}`
}
/** `D5` for a data row (local to its own sheet). */
const cellOf = <S extends ColSheet>(
  sheet: S,
  key: (typeof columns)[S][number],
  row: number,
) => `${letter((columns[sheet] as readonly string[]).indexOf(key))}${row}`
/** `Settings!B3` (value column B) */
const rowCell = <S extends RowSheet>(
  sheet: S,
  key: (typeof rows)[S][number],
  local = false,
  col = 'B',
) =>
  `${local ? '' : sheet + '!'}${col}${(rows[sheet] as readonly string[]).indexOf(key) + 1}`

const num = (v: unknown): number | null =>
  v === '' || v == null ? null : Number(v)
const sumif = (type: string, sheet: 'Transactions' | 'Budget') =>
  sheet === 'Transactions'
    ? `SUMIF(${colRange('Transactions', 'type')},"${type}",${colRange('Transactions', 'monthAmount')})`
    : `SUMIF(${colRange('Budget', 'type')},"${type}",${colRange('Budget', 'monthly')})`
const frequencyFormula = (ref: string) =>
  Object.entries(frequencies).reduceRight(
    (next, [label, count]) => `IF(${ref}="${label}",${count},${next})`,
    '0',
  )

interface Cell {
  value: number | string | null
  formula?: string
  format?: string
}
const cash = (value: unknown, formula?: string): Cell => ({
  value: num(value),
  formula,
  format: CASH,
})
const pct = (value: unknown, formula?: string): Cell => ({
  value: num(value),
  formula,
  format: PERCENT,
})
const plain = (value: Cell['value'], formula?: string): Cell => ({
  value,
  formula,
})

type Item = Cell | string | number | null
interface Sheet {
  name: string
  widths: number[]
  data: Item[][]
}

function addSheet(wb: ExcelJS.Workbook, sheet: Sheet) {
  const ws = wb.addWorksheet(sheet.name, {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 1 }],
  })
  ws.columns = sheet.widths.map((width) => ({ width }))
  sheet.data.forEach((row, r) => {
    row.forEach((item, c) => {
      const cell = ws.getCell(r + 1, c + 1)
      const spec: Cell =
        typeof item === 'object' && item !== null ? item : plain(item)
      if (spec.formula) {
        cell.value = {
          formula: spec.formula,
          result: spec.value ?? '',
        } as ExcelJS.CellFormulaValue
      } else if (spec.value !== null) {
        cell.value = spec.value
      }
      if (spec.format) cell.numFmt = spec.format
      if (r === 0 && typeof item === 'string') {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF203657' },
        }
      }
    })
  })
}

export function buildWorkbook(state: State): ExcelJS.Workbook {
  CASH = cashFormat(state.currency)
  const r = report(state)
  const goalName = new Map(state.goals.map((g) => [g.id, g.name]))
  const S = (k: (typeof rows.Settings)[number]) => rowCell('Settings', k)
  const O = (k: (typeof rows.Overview)[number], col = 'B') =>
    rowCell('Overview', k, true, col)
  const validTx = (t: State['transactions'][number]) =>
    /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
    t.amount !== '' &&
    Number.isFinite(Number(t.amount))
  const txRange = colRange('Transactions', 'monthAmount')
  const txType = colRange('Transactions', 'type')
  const txGoal = colRange('Transactions', 'goalId')
  const goalSum = (type: string) =>
    `SUMIFS(${txRange},${txGoal},"general",${txType},"${type}")`

  const overview: Item[][] = [
    [`Monthly summary (${state.currency})`, 'Planned', 'Actual'],
    ['Report month', plain(state.month, S('month'))],
    [
      'Take-home income',
      cash(
        r.planIncome,
        `IF(ISNUMBER(${S('pay')}),${S('pay')}*${S('perYear')}/12,"")`,
      ),
      cash(
        r.actualIncome,
        `IF(COUNTIFS(${txType},"Income",${colRange('Transactions', 'inMonth')},1),${sumif('Income', 'Transactions')},"")`,
      ),
    ],
    [
      'Spending',
      cash(r.planSpend, `${sumif('Expense', 'Budget')}+${S('gym')}`),
      cash(
        r.active ? r.actualSpend : null,
        `IF(COUNT(${txRange}),${sumif('Expense', 'Transactions')}+${sumif('Fund expense', 'Transactions')},"")`,
      ),
    ],
    [
      'Net savings added',
      cash(r.planSaved, sumif('Savings transfer', 'Budget')),
      cash(
        r.active ? r.actualSaved : null,
        `IF(COUNT(${txRange}),${sumif('Savings transfer', 'Transactions')}-${sumif('Savings withdrawal', 'Transactions')}-${sumif('Fund expense', 'Transactions')},"")`,
      ),
    ],
    [
      'Cash left before target',
      cash(
        r.planCash,
        `IF(ISNUMBER(${O('income')}),${O('income')}-${O('spend')}-${O('saved')},"")`,
      ),
      cash(
        r.actualCash,
        `IF(ISNUMBER(${O('income', 'C')}),${O('income', 'C')}-${O('spend', 'C')}-${O('saved', 'C')},"")`,
      ),
    ],
    [
      'Savings rate',
      pct(
        r.planRate,
        `IF(AND(ISNUMBER(${O('income')}),${O('income')}>0),${O('saved')}/${O('income')},"")`,
      ),
      pct(
        r.actualRate,
        `IF(AND(ISNUMBER(${O('income', 'C')}),${O('income', 'C')}>0),${O('saved', 'C')}/${O('income', 'C')},"")`,
      ),
    ],
    [
      'General savings target',
      cash(num(state.target), `IF(ISNUMBER(${S('target')}),${S('target')},"")`),
    ],
    [
      'Planned cash after target',
      cash(
        r.afterTarget,
        `IF(ISNUMBER(${O('cash')}),${O('cash')}-N(${O('target')}),"")`,
      ),
    ],
    [
      'General savings added this month',
      null,
      cash(
        r.general,
        `${goalSum('Savings transfer')}-${goalSum('Savings withdrawal')}-${goalSum('Fund expense')}`,
      ),
    ],
    [
      'Still needed for target',
      null,
      cash(r.leftToSave, `MAX(0,N(${O('target')})-${O('general', 'C')})`),
    ],
    [],
    ['Category', 'Planned spending', 'Actual spending', 'Plan remaining'],
    ...r.breakdown.map((row): Item[] => [
      row.name,
      cash(row.planned),
      cash(r.active ? row.actual : null),
      cash(r.active ? row.planned - row.actual : null),
    ]),
  ]

  const settings: Item[][] = [
    [`Budget settings (${state.currency})`, 'Value'],
    ['Report month', state.month],
    ['Take-home pay per payment', cash(state.pay)],
    ['Pay frequency', state.cadence],
    [
      'Payments per year',
      plain(
        frequencies[state.cadence],
        frequencyFormula(rowCell('Settings', 'cadence', true)),
      ),
    ],
    ['Monthly savings target', cash(state.target)],
    ['Gym monthly average', cash(r.gym)],
    ['Gym choice', r.activeGym.name],
    ['Ontario HST used for gym', pct(0.13)],
    ['Category breakdown shows figures at download.'],
    ['Dates and months use ISO text.'],
  ]

  const budget: Item[][] = [
    [
      'Budget item',
      'Category',
      'Type',
      'Frequency',
      'Amount',
      'Due month',
      'Monthly plan',
      'Payments per year',
    ],
    ...r.budget.map((row, i): Item[] => {
      const n = i + 2
      const c = (k: (typeof columns.Budget)[number]) => cellOf('Budget', k, n)
      return [
        row.name,
        row.category,
        row.type,
        row.cadence,
        cash(row.amount),
        row.due,
        cash(
          row.monthly,
          `IF(${c('frequency')}="One-time",IF(${c('due')}=${S('month')},N(${c('amount')}),0),N(${c('amount')})*${c('perYear')}/12)`,
        ),
        plain(frequencies[row.cadence], frequencyFormula(c('frequency'))),
      ]
    }),
  ]

  const transactions: Item[][] = [
    [
      'Date',
      'Type',
      'Category',
      'Amount',
      'Savings goal',
      'Notes',
      'Goal ID',
      'Selected month amount',
      'In selected month',
      'Through selected month',
    ],
    ...state.transactions.map((row, i): Item[] => {
      const n = i + 2
      const c = (k: (typeof columns.Transactions)[number]) =>
        cellOf('Transactions', k, n)
      const valid = validTx(row)
      const inMonth = valid && row.date.startsWith(state.month + '-')
      const shape = `LEN(${c('date')})=10,ISNUMBER(${c('amount')})`
      return [
        row.date,
        row.type,
        row.category,
        cash(row.amount),
        goalName.get(row.goal) || '',
        row.notes,
        row.goal,
        cash(
          inMonth ? row.amount : null,
          `IF(${c('inMonth')}=1,${c('amount')},"")`,
        ),
        plain(
          inMonth ? 1 : 0,
          `IF(AND(LEFT(${c('date')},7)=${S('month')},${shape}),1,0)`,
        ),
        plain(
          valid && row.date.slice(0, 7) <= state.month ? 1 : 0,
          `IF(AND(LEFT(${c('date')},7)<=${S('month')},${shape}),1,0)`,
        ),
      ]
    }),
  ]

  const goals: Item[][] = [
    [
      'Goal',
      'Target balance',
      'Opening balance',
      'Net activity',
      'Balance',
      'Progress',
      'Goal ID',
    ],
    ...r.goalRows.map((row, i): Item[] => {
      const n = i + 2
      const c = (k: (typeof columns.Goals)[number]) => cellOf('Goals', k, n)
      const total = (type: string) =>
        `SUMIFS(${colRange('Transactions', 'amount')},${txGoal},${c('goalId')},${txType},"${type}",${colRange('Transactions', 'throughMonth')},1)`
      return [
        row.name,
        cash(row.target),
        cash(row.opening),
        cash(
          row.net,
          `${total('Savings transfer')}-${total('Savings withdrawal')}-${total('Fund expense')}`,
        ),
        cash(row.balance, `N(${c('opening')})+${c('net')}`),
        pct(
          row.progress,
          `IF(${c('target')}>0,${c('balance')}/${c('target')},"")`,
        ),
        row.id,
      ]
    }),
  ]

  // Static values (no formulas): these sheets are for reading and filtering.
  const accountName = new Map(state.accounts.map((a) => [a.id, a.name]))
  const balances = accountBalances(state, state.month)
  const accounts: Item[][] = [
    [
      'Account',
      'Kind',
      'Opening',
      `Balance end of ${state.month}`,
      'APR %',
      'Monthly payment',
    ],
    ...balances.map(({ account: a, signed }): Item[] => [
      a.name,
      a.kind,
      cash(a.opening),
      cash(signed),
      isDebt(a) ? plain(num(a.rate)) : null,
      isDebt(a) ? cash(a.payment) : null,
    ]),
  ]
  const transfers: Item[][] = [
    ['Date', 'From', 'To', 'Amount', 'Notes'],
    ...state.transfers.map((x): Item[] => [
      x.date,
      accountName.get(x.from) ?? '',
      accountName.get(x.to) ?? '',
      cash(x.amount),
      x.notes,
    ]),
  ]
  const recurring: Item[][] = [
    [
      'Name',
      'Type',
      'Category',
      'Frequency',
      'Amount',
      'Start',
      'Savings goal',
    ],
    ...state.recurring.map((r): Item[] => [
      r.name,
      r.type,
      r.category,
      r.cadence,
      cash(r.amount),
      r.start,
      goalName.get(r.goal) || '',
    ]),
  ]

  const wb = new ExcelJS.Workbook()
  wb.calcProperties.fullCalcOnLoad = true
  addSheet(wb, { name: 'Overview', widths: [38, 22, 22, 20], data: overview })
  addSheet(wb, { name: 'Settings', widths: [55, 39], data: settings })
  addSheet(wb, {
    name: 'Budget',
    widths: [30, 23, 21, 20, 17, 17, 17, 19],
    data: budget,
  })
  addSheet(wb, {
    name: 'Transactions',
    widths: [16, 23, 22, 18, 23, 38, 38, 24, 21, 27],
    data: transactions,
  })
  addSheet(wb, {
    name: 'Goals',
    widths: [28, 17, 17, 17, 17, 16, 39],
    data: goals,
  })
  if (state.accounts.length) {
    addSheet(wb, {
      name: 'Accounts',
      widths: [28, 16, 17, 26, 12, 18],
      data: accounts,
    })
    addSheet(wb, {
      name: 'Transfers',
      widths: [16, 24, 24, 17, 38],
      data: transfers,
    })
  }
  if (state.recurring.length)
    addSheet(wb, {
      name: 'Recurring',
      widths: [28, 20, 22, 16, 17, 16, 24],
      data: recurring,
    })
  return wb
}

export async function workbookBlob(state: State): Promise<Blob> {
  const buffer = await buildWorkbook(state).xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
