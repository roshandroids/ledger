import { useTranslation } from '../i18n'
import { useMemo, useState } from 'react'
import { report } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { AddButton, RemoveButton } from '../components/AddButton'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { MoneyInput } from '../components/MoneyInput'
import { Panel } from '../components/Panel'
import { TextInput } from '../components/TextInput'
import { fmt, pct } from '../format'
import { useRowFocus } from '../useRowFocus'

export function GoalsPage() {
  const t = useTranslation()
  const state = useLedger((s) => s.state)
  const { addRow, updateRow, removeRow } = useLedger.getState()
  const [blocked, setBlocked] = useState(false)
  const rows = useMemo(() => report(state).goalRows, [state])
  const rowFocus = useRowFocus(
    () => addRow('goals'),
    (i) => {
      const ok = removeRow('goals', i)
      if (!ok) setBlocked(true)
      return ok
    },
  )
  const { tableRef, addRef, onAdd, onRemove } = rowFocus
  return (
    <>
      <Panel
        title={t('Savings goals')}
        subtitle="Balance is the opening balance plus transfers, minus withdrawals and fund expenses, up to the selected month."
        action={
          <AddButton ref={addRef} onClick={onAdd}>
            + Add goal
          </AddButton>
        }
      >
        <div ref={tableRef}>
          <DataTable
            caption={t('Savings goals')}
            headers={[
              'Goal',
              'Target balance',
              'Opening balance',
              'Balance this month',
              'Progress',
              '',
            ]}
            empty="Add a savings goal to track its balance."
            rows={rows.map((r, i) => ({
              key: r.id,
              cells: [
                r.id === 'general' ? (
                  'General savings'
                ) : (
                  <TextInput
                    label="Goal name"
                    maxLength={120}
                    value={r.name}
                    onChange={(name) => updateRow('goals', i, { name })}
                  />
                ),
                <MoneyInput
                  label="Target balance"
                  value={r.target}
                  onChange={(target) => updateRow('goals', i, { target })}
                />,
                <MoneyInput
                  label="Opening balance"
                  allowNegative
                  value={r.opening}
                  onChange={(opening) => updateRow('goals', i, { opening })}
                />,
                fmt(r.balance),
                pct(r.progress),
                r.id === 'general' ? (
                  ''
                ) : (
                  <RemoveButton label="goal" onClick={() => onRemove(i)} />
                ),
              ],
            }))}
          />
        </div>
      </Panel>
      <ConfirmDialog
        open={blocked}
        title="Can't remove this goal"
        onClose={() => setBlocked(false)}
      >
        This goal has linked transactions. Move those transactions to another
        goal before removing it.
      </ConfirmDialog>
    </>
  )
}
