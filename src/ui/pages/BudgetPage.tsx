import { useMemo } from 'react'
import { frequencies, report } from '../../domain'
import type { Cadence } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { AddButton, RemoveButton } from '../components/AddButton'
import { DrivePanel } from '../components/DrivePanel'
import { BackupPanel } from '../components/BackupPanel'
import { CategoryInput } from '../components/CategoryInput'
import { CategoryDatalist } from '../components/CategoryDatalist'
import { MonthPicker } from '../components/MonthPicker'
import { DataTable } from '../components/DataTable'
import { MoneyInput } from '../components/MoneyInput'
import { Panel } from '../components/Panel'
import { Select } from '../components/Select'
import { TextInput } from '../components/TextInput'
import { fmt } from '../format'
import { useRowFocus } from '../useRowFocus'

const cadences = Object.keys(frequencies) as Cadence[]

export function BudgetPage() {
  const state = useLedger((s) => s.state)
  const { setSetting, addRow, updateRow, removeRow } = useLedger.getState()
  const rows = useMemo(() => report(state).budget, [state])
  const rowFocus = useRowFocus(
    () => addRow('budget'),
    (i) => removeRow('budget', i),
  )
  const { tableRef, addRef, onAdd, onRemove } = rowFocus
  return (
    <>
      <Panel
        title="Pay and monthly target"
        subtitle="Use your pay after tax. Monthly plans average recurring payments across the year."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Take-home pay per payment
            <MoneyInput
              label="Take-home pay per payment"
              value={state.pay}
              onChange={(v) => setSetting('pay', v)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Pay frequency
            <Select
              label="Pay frequency"
              value={state.cadence}
              options={cadences.filter((c) => c !== 'One-time')}
              onChange={(v) => setSetting('cadence', v as Cadence)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Monthly savings target
            <MoneyInput
              label="Monthly savings target"
              value={state.target}
              onChange={(v) => setSetting('target', v)}
            />
          </label>
        </div>
      </Panel>
      <Panel
        title="Budget items"
        subtitle="Use any category name. One-time costs belong to the month you select for that row."
        action={
          <AddButton ref={addRef} onClick={onAdd}>
            + Add item
          </AddButton>
        }
      >
        <CategoryDatalist extra={state.budget.map((b) => b.category)} />
        <div ref={tableRef}>
          <DataTable
            caption="Budget items"
            headers={[
              'Item',
              'Category',
              'Type',
              'Frequency',
              'Amount',
              'Due month',
              'Monthly plan',
              '',
            ]}
            empty="Your budget is empty. Add a recurring bill, one-time cost or savings transfer."
            rows={rows.map((r, i) => ({
              key: i,
              cells: [
                <TextInput
                  label="Item"
                  maxLength={120}
                  value={r.name}
                  onChange={(name) => updateRow('budget', i, { name })}
                />,
                <CategoryInput
                  value={r.category}
                  onChange={(category) => updateRow('budget', i, { category })}
                />,
                <Select
                  label="Budget type"
                  value={r.type}
                  options={['Expense', 'Savings transfer']}
                  onChange={(v) =>
                    updateRow('budget', i, { type: v as typeof r.type })
                  }
                />,
                <Select
                  label="Frequency"
                  value={r.cadence}
                  options={cadences}
                  onChange={(v) =>
                    updateRow('budget', i, { cadence: v as Cadence })
                  }
                />,
                <MoneyInput
                  label="Amount"
                  value={r.amount}
                  onChange={(amount) => updateRow('budget', i, { amount })}
                />,
                r.cadence === 'One-time' ? (
                  <MonthPicker
                    label="Due month"
                    value={r.due}
                    onChange={(due) => updateRow('budget', i, { due })}
                  />
                ) : (
                  '—'
                ),
                fmt(r.monthly),
                <RemoveButton
                  label="budget item"
                  onClick={() => onRemove(i)}
                />,
              ],
            }))}
          />
        </div>
      </Panel>
      <BackupPanel />
      <DrivePanel />
    </>
  )
}
