import { useLedger } from '../store/useLedger'
import { toCsv } from './csv'

export function exportTransactionsCsv() {
  const { transactions, accounts } = useLedger.getState().state
  const accountName = (id?: string) =>
    accounts.find((a) => a.id === id)?.name ?? ''
  const csv = toCsv(
    ['Date', 'Type', 'Category', 'Amount', 'Goal', 'Notes', 'Account', 'Tags'],
    transactions.map((t) => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.goal,
      t.notes,
      accountName(t.account),
      (t.tags ?? []).join(', '),
    ]),
    [1, 2, 4, 5, 6, 7],
  )
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'ledger-transactions.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
