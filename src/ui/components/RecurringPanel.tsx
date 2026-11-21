import { recurringCadences, recurringTypes } from '../../domain'
import type { Recurring } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { AddButton, RemoveButton } from './AddButton'
import { DataTable } from './DataTable'
import { DatePicker } from './DatePicker'
import { MoneyInput } from './MoneyInput'
import { Panel } from './Panel'
import { Select } from './Select'
import { TextInput } from './TextInput'
import { useRowFocus } from '../useRowFocus'

export function RecurringPanel() {
  const state = useLedger((s) => s.state)
  const { addRow, updateRow, removeRow } = useLedger.getState()
  const { tableRef, addRef, onAdd, onRemove } = useRowFocus(
    () => addRow('recurring'),
    (i) => removeRow('recurring', i),
  )
  const goals: [string, string][] = state.goals.map((g) => [
    g.id === 'general' ? '' : g.id,
    g.name || 'Unnamed goal',
  ])
  return (
    <Panel
      title="Recurring bills and income"
      subtitle="Rules create dated transactions for a month on demand. Overview shows what is paid, due soon or overdue."
      action={
        <AddButton ref={addRef} onClick={onAdd}>
          + Add recurring
        </AddButton>
      }
    >
      <div ref={tableRef}>
        <DataTable
          caption="Recurring rules"
          headers={[
            'Name',
            'Type',
            'Category',
            'Amount',
            'Frequency',
            'Starts',
            'Goal',
            '',
          ]}
          empty="No recurring rules. Add rent, a subscription or your pay."
          rows={state.recurring.map((r, i) => ({
            key: r.id,
            cells: [
              <TextInput
                label="Bill name"
                maxLength={120}
                value={r.name}
                onChange={(name) => updateRow('recurring', i, { name })}
              />,
              <Select
                label="Bill type"
                value={r.type}
                options={recurringTypes}
                onChange={(v) =>
                  updateRow('recurring', i, { type: v as Recurring['type'] })
                }
              />,
              <TextInput
                label="Bill category"
                list="category-list"
                value={r.category}
                onChange={(category) => updateRow('recurring', i, { category })}
              />,
              <MoneyInput
                label="Bill amount"
                value={r.amount}
                onChange={(amount) => updateRow('recurring', i, { amount })}
              />,
              <Select
                label="Bill frequency"
                value={r.cadence}
                options={recurringCadences}
                onChange={(v) =>
                  updateRow('recurring', i, {
                    cadence: v as Recurring['cadence'],
                  })
                }
              />,
              <DatePicker
                label="Bill start date"
                value={r.start}
                onChange={(start) => updateRow('recurring', i, { start })}
              />,
              r.type === 'Savings transfer' ? (
                <Select
                  label="Bill goal"
                  value={r.goal}
                  options={goals}
                  onChange={(goal) => updateRow('recurring', i, { goal })}
                />
              ) : (
                '—'
              ),
              <RemoveButton
                label="recurring rule"
                onClick={() => onRemove(i)}
              />,
            ],
          }))}
        />
      </div>
    </Panel>
  )
}
