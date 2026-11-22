import { describe, expect, it } from 'vitest'
import { parseExpenseCommand } from './expenseCommand'

describe('parseExpenseCommand', () => {
  it.each([
    ['Log twenty bucks for gas', { amount: 20, notes: 'gas' }],
    ['$40 in Walmart groceries.', { amount: 40, notes: 'Walmart groceries' }],
    [
      'I spent $40.50 on groceries at Walmart',
      { amount: 40.5, notes: 'groceries at Walmart' },
    ],
    ['Paid forty dollars at Walmart', { amount: 40, notes: 'Walmart' }],
    ['Add $1,200 for rent', { amount: 1200, notes: 'rent' }],
  ])('parses %s', (command, expected) => {
    expect(parseExpenseCommand(command)).toEqual(expected)
  })

  it.each([
    'Groceries at Walmart',
    '$0 on groceries',
    '$40 at',
    '$40.123 for groceries',
  ])('rejects %s', (command) => {
    expect(parseExpenseCommand(command)).toBeNull()
  })
})
