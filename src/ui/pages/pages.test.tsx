import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './../../App'
import { starter } from '../../domain'
import { useLedger } from '../../store/useLedger'

/** Open a custom dropdown by its label and pick an option. */
async function choose(label: string, option: string) {
  await userEvent.click(screen.getByLabelText(new RegExp('^' + label)))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

beforeEach(() => {
  localStorage.clear()
  useLedger.setState({
    state: { ...starter(false), month: '2026-03' },
    canSave: true,
  })
})

describe('Budget', () => {
  it('adds a row, focuses its first input, and removes it back to the Add button', async () => {
    at('/budget')
    await userEvent.click(screen.getByRole('button', { name: '+ Add item' }))
    expect(screen.getByLabelText('Item')).toHaveFocus()
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove budget item' }),
    )
    expect(screen.getByRole('button', { name: '+ Add item' })).toHaveFocus()
  })

  it('shows Due month only for One-time and keeps focus on the select', async () => {
    at('/budget')
    await userEvent.click(screen.getByRole('button', { name: '+ Add item' }))
    expect(screen.queryByLabelText(/^Due month/)).toBeNull()
    await choose('Frequency', 'One-time')
    expect(screen.getByLabelText(/^Due month/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Frequency/)).toHaveTextContent('One-time')
  })
})

describe('Trends and rollover', () => {
  const seed = (rollover: boolean) =>
    useLedger.setState({
      state: {
        ...starter(false),
        month: '2026-03',
        rollover,
        budget: [
          {
            name: 'Food',
            category: 'Food',
            type: 'Expense',
            cadence: 'Monthly',
            amount: 100,
            due: '',
          },
        ],
        transactions: [
          {
            date: '2026-02-04',
            type: 'Expense',
            category: 'Food',
            amount: 40,
            goal: '',
            notes: '',
          },
          {
            date: '2026-03-04',
            type: 'Expense',
            category: 'Food',
            amount: 10,
            goal: '',
            notes: '',
          },
        ],
      },
      canSave: true,
    })

  it('lists each month in the trends table', () => {
    seed(false)
    at('/trends')
    expect(screen.getByRole('table', { name: /by month/ })).toHaveTextContent(
      'Feb 26',
    )
    expect(
      screen.getByText('Choose a category to compare.'),
    ).toBeInTheDocument()
  })

  it('shows carried-over budget only when rollover is on', () => {
    seed(false)
    const { unmount } = at('/overview')
    expect(screen.queryByText('Carried over')).toBeNull()
    unmount()
    seed(true)
    at('/overview')
    // Feb leftover 60 carries into March: remaining = 100 + 60 - 10.
    expect(screen.getByText('Carried over')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
  })
})

describe('CSV import', () => {
  const csv =
    'Date,Description,Amount\n2026-03-05,Tim Hortons,-4.50\n2026-03-06,Pay,2000\nbad,X,1\n'
  const upload = () =>
    userEvent.upload(
      screen.getByLabelText('CSV file'),
      new File([csv], 'bank.csv', { type: 'text/csv' }),
    )

  it('previews, imports valid rows once, and skips them on re-import', async () => {
    at('/transactions')
    await userEvent.type(
      screen.getByLabelText('Category rules'),
      'hortons = Coffee',
    )
    await upload()
    expect(
      await screen.findByText(
        /2 ready · 0 already in your ledger · 1 with errors/,
      ),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Import 2 transactions' }),
    )
    expect(useLedger.getState().state.transactions).toMatchObject([
      { date: '2026-03-05', type: 'Expense', amount: 4.5, category: 'Coffee' },
      { date: '2026-03-06', type: 'Income', amount: 2000 },
    ])
    await upload()
    expect(
      await screen.findByText(/0 ready · 2 already in your ledger/),
    ).toBeInTheDocument()
  })
})

describe('Recurring bills', () => {
  it('adds a rule on Budget and focuses its first field', async () => {
    at('/budget')
    await userEvent.click(
      screen.getByRole('button', { name: '+ Add recurring' }),
    )
    expect(screen.getByLabelText('Bill name')).toHaveFocus()
    await userEvent.type(screen.getByLabelText('Bill name'), 'Rent')
    await userEvent.type(screen.getByLabelText('Bill amount'), '900')
    expect(useLedger.getState().state.recurring[0]).toMatchObject({
      name: 'Rent',
      amount: '900',
      start: '2026-03-01',
    })
  })

  it('shows bills on Overview and records one once', async () => {
    useLedger.setState({
      state: {
        ...starter(false),
        month: '2026-03',
        recurring: [
          {
            id: 'r',
            name: 'Rent',
            category: 'Housing',
            type: 'Expense',
            cadence: 'Monthly',
            amount: 900,
            start: '2026-03-01',
            goal: '',
          },
        ],
      },
      canSave: true,
    })
    at('/overview')
    await userEvent.click(screen.getByRole('button', { name: /Mark paid/ }))
    expect(useLedger.getState().state.transactions).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Mark paid/ })).toBeNull()
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })
})

describe('Limit alerts', () => {
  it('warns about categories near or over their budget', () => {
    useLedger.setState({
      state: {
        ...starter(false),
        month: '2026-03',
        budget: [
          ['Food', 100],
          ['Fun', 100],
          ['Gas', 100],
        ].map(([category, amount]) => ({
          name: String(category),
          category: String(category),
          type: 'Expense' as const,
          cadence: 'Monthly' as const,
          amount,
          due: '',
        })),
        transactions: [
          ['Food', 150],
          ['Fun', 85],
          ['Gas', 10],
        ].map(([category, amount]) => ({
          date: '2026-03-04',
          type: 'Expense' as const,
          category: String(category),
          amount,
          goal: '',
          notes: '',
        })),
      },
      canSave: true,
    })
    at('/overview')
    expect(
      screen.getByText(/Food is over its limit \(150%\)/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Fun is near its limit \(85%\)/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Gas is/)).toBeNull()
    expect(screen.getAllByText(/Over limit/)).toHaveLength(1)
  })
})

describe('Transaction filters', () => {
  const seed = () => {
    const s = useLedger.getState()
    for (const [category, amount] of [
      ['Food', 20],
      ['Fun', 5],
      ['Food', 40],
    ] as const) {
      s.addRow('transactions')
      const i = useLedger.getState().state.transactions.length - 1
      s.updateRow('transactions', i, { category, amount, date: '2026-03-02' })
    }
  }

  it('filters from the URL and clears', async () => {
    seed()
    at('/transactions?q=food')
    expect(screen.getByText('Showing 2 of 3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('Showing 3 of 3')).toBeInTheDocument()
  })

  it('bulk re-categorizes and deletes the selected rows', async () => {
    seed()
    at('/transactions?sort=category')
    const boxes = screen.getAllByLabelText('Select transaction')
    await userEvent.click(boxes[0])
    await userEvent.click(boxes[1])
    await userEvent.type(
      screen.getByLabelText('Category for selected'),
      'Meals',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Set category' }))
    expect(
      useLedger.getState().state.transactions.map((t) => t.category),
    ).toEqual(['Meals', 'Fun', 'Meals'])
    await userEvent.click(screen.getAllByLabelText('Select transaction')[0])
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete selected' }),
    )
    expect(useLedger.getState().state.transactions).toHaveLength(2)
  })
})

describe('Transactions', () => {
  it('shows the goal select only for goal-related types', async () => {
    at('/transactions')
    await userEvent.click(
      screen.getByRole('button', { name: '+ Add transaction' }),
    )
    expect(screen.queryByLabelText(/^Savings goal/)).toBeNull()
    await choose('Transaction type', 'Savings transfer')
    expect(screen.getByLabelText(/^Savings goal/)).toBeInTheDocument()
  })
})

describe('Goals', () => {
  it('blocks removal of a goal with linked transactions with a dialog', async () => {
    const s = useLedger.getState()
    s.addRow('goals')
    s.addRow('transactions')
    const id = useLedger.getState().state.goals[1].id
    s.updateRow('transactions', 0, {
      type: 'Savings transfer',
      goal: id,
      amount: '5',
    })
    at('/goals')
    await userEvent.click(screen.getByRole('button', { name: 'Remove goal' }))
    expect(useLedger.getState().state.goals).toHaveLength(2)
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'linked transactions',
    )
  })

  it('general goal has no remove button', () => {
    at('/goals')
    expect(screen.queryByRole('button', { name: 'Remove goal' })).toBeNull()
  })
})

describe('Overview', () => {
  it('shows planned numbers from the report', () => {
    useLedger.getState().setSetting('pay', '1000')
    useLedger.getState().setSetting('cadence', 'Monthly')
    at('/overview')
    expect(
      screen.getByText('Take-home income').parentElement,
    ).toHaveTextContent('$1,000.00')
    expect(screen.getByTestId('remaining')).toHaveTextContent('$1,000.00')
  })
})

describe('Backup', () => {
  it('rejects a non-backup file and restores a valid one after confirming', async () => {
    at('/budget')
    const file = screen.getByLabelText('Backup file')
    await userEvent.upload(
      file,
      new File(['nope'], 'x.json', { type: 'application/json' }),
    )
    expect(
      await screen.findByText('That file is not a Ledger backup.'),
    ).toBeInTheDocument()
    const good = JSON.stringify({
      state: { ...starter(false), pay: '777', month: '2026-03' },
    })
    await userEvent.upload(
      file,
      new File([good], 'b.json', { type: 'application/json' }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Replace', hidden: true }),
    )
    expect(useLedger.getState().state.pay).toBe('777')
  })
})

describe('Pickers', () => {
  it('month picker changes the report month', async () => {
    at('/overview')
    await userEvent.click(screen.getByLabelText(/^Report month/))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Previous year' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Jun' }))
    expect(useLedger.getState().state.month).toBe('2025-06')
  })

  it('date picker sets an ISO date', async () => {
    at('/transactions')
    await userEvent.click(
      screen.getByRole('button', { name: '+ Add transaction' }),
    )
    await userEvent.click(screen.getByLabelText(/^Date/))
    await userEvent.click(
      await screen.findByRole('button', { name: /March 15th, 2026/ }),
    )
    expect(useLedger.getState().state.transactions[0].date).toBe('2026-03-15')
  })

  it('there is no dedicated gym section', () => {
    at('/budget')
    expect(screen.queryByText('Gym membership')).toBeNull()
  })
})
