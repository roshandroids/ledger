import { useLedger } from '../store/useLedger'
import { toCsv } from './csv'

export function exportTransactionsCsv() {
  const { transactions } = useLedger.getState().state
  const csv = toCsv(
    ['Date', 'Type', 'Category', 'Amount', 'Goal', 'Notes'],
    transactions.map((t) => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.goal,
      t.notes,
    ]),
    [1, 2, 4, 5],
  )
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'ledger-transactions.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
