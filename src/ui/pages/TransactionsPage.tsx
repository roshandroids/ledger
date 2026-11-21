import { goalTypes, transactionTypes } from '../../domain'
import type { TransactionType } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { AddButton, RemoveButton } from '../components/AddButton'
import { CategoryInput } from '../components/CategoryInput'
import { CategoryDatalist } from '../components/CategoryDatalist'
import { DataTable } from '../components/DataTable'
import { MoneyInput } from '../components/MoneyInput'
import { Panel } from '../components/Panel'
import { Select } from '../components/Select'
import { TextInput } from '../components/TextInput'
import { useRowFocus } from '../useRowFocus'

export function TransactionsPage() {
  const state = useLedger((s) => s.state)
  const { addRow, updateRow, removeRow } = useLedger.getState()
  const rowFocus = useRowFocus(
    () => addRow('transactions'),
    (i) => removeRow('transactions', i),
  )
  const { tableRef, addRef, onAdd, onRemove } = rowFocus
  const goals: [string, string][] = [
    ['', 'Choose a goal'],
    ...state.goals.map((g): [string, string] => [
      g.id,
      g.name || 'Unnamed goal',
    ]),
  ]
  return (
    <Panel
      title="Transactions"
      subtitle="Record what actually happened. Rows with an invalid date or amount are ignored."
      action={
        <AddButton ref={addRef} onClick={onAdd}>
          + Add transaction
        </AddButton>
      }
    >
      <CategoryDatalist extra={state.budget.map((b) => b.category)} />
      <div ref={tableRef}>
        <DataTable
          caption="Transactions"
          headers={[
            'Date',
            'Type',
            'Category',
            'Amount',
            'Savings goal',
            'Notes',
            '',
          ]}
          empty="No transactions yet. Add income, expenses or a transfer."
          rows={state.transactions.map((t, i) => ({
            key: i,
            cells: [
              <TextInput
                label="Date"
                type="date"
                value={t.date}
                onChange={(date) => updateRow('transactions', i, { date })}
              />,
              <Select
                label="Transaction type"
                value={t.type}
                options={transactionTypes}
                onChange={(v) =>
                  updateRow('transactions', i, { type: v as TransactionType })
                }
              />,
              <CategoryInput
                value={t.category}
                onChange={(category) =>
                  updateRow('transactions', i, { category })
                }
              />,
              <MoneyInput
                label="Amount"
                allowNegative
                value={t.amount}
                onChange={(amount) => updateRow('transactions', i, { amount })}
              />,
              goalTypes.includes(t.type) ? (
                <Select
                  label="Savings goal"
                  value={t.goal}
                  options={goals}
                  onChange={(goal) => updateRow('transactions', i, { goal })}
                />
              ) : (
                '—'
              ),
              <TextInput
                label="Notes"
                maxLength={300}
                value={t.notes}
                onChange={(notes) => updateRow('transactions', i, { notes })}
              />,
              <RemoveButton label="transaction" onClick={() => onRemove(i)} />,
            ],
          }))}
        />
      </div>
    </Panel>
  )
}
