import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './../../App'
import { starter } from '../../domain'
import { useLedger } from '../../store/useLedger'

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
    expect(screen.queryByLabelText('Due month')).toBeNull()
    await userEvent.selectOptions(
      screen.getByLabelText('Frequency'),
      'One-time',
    )
    expect(screen.getByLabelText('Due month')).toBeInTheDocument()
    expect(screen.getByLabelText('Frequency')).toHaveValue('One-time')
  })

  it('gym radio updates the store', async () => {
    at('/budget')
    await userEvent.click(screen.getByRole('radio', { name: /Fit4Less/ }))
    expect(useLedger.getState().state.gym).toBe('fit')
  })
})

describe('Transactions', () => {
  it('shows the goal select only for goal-related types', async () => {
    at('/transactions')
    await userEvent.click(
      screen.getByRole('button', { name: '+ Add transaction' }),
    )
    expect(screen.queryByLabelText('Savings goal')).toBeNull()
    await userEvent.selectOptions(
      screen.getByLabelText('Transaction type'),
      'Savings transfer',
    )
    expect(screen.getByLabelText('Savings goal')).toBeInTheDocument()
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
