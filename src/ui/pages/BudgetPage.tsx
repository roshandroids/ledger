import { useTranslation } from '../i18n'
import { useState } from 'react'
import { currencies, frequencies, monthly } from '../../domain'
import type { Cadence } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { AddButton, RemoveButton } from '../components/AddButton'
import { RecurringPanel } from '../components/RecurringPanel'
import { CategoryInput } from '../components/CategoryInput'
import { MonthPicker } from '../components/MonthPicker'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { MoneyInput } from '../components/MoneyInput'
import { Panel } from '../components/Panel'
import { Select } from '../components/Select'
import { TextInput } from '../components/TextInput'
import { fmt } from '../format'
import { useRowFocus } from '../useRowFocus'

const cadences = Object.keys(frequencies) as Cadence[]

export function BudgetPage() {
  const t = useTranslation()
  const state = useLedger((s) => s.state)
  const { setSetting, addRow, updateRow, removeRow, moveBudgetToRecurring } =
    useLedger.getState()
  const categories = [...state.budget, ...state.recurring].map(
    (b) => b.category,
  )
  const [moving, setMoving] = useState<{ index: number; start: string } | null>(
    null,
  )
  const [moveMessage, setMoveMessage] = useState('')
  const rowFocus = useRowFocus(
    () => addRow('budget'),
    (i) => removeRow('budget', i),
  )
  const { tableRef, addRef, onAdd, onRemove } = rowFocus
  return (
    <>
      <Panel
        title={t('Pay and monthly target')}
        subtitle="Use your pay after tax. Monthly plans average recurring payments across the year."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            {t('Take-home pay per payment')}
            <MoneyInput
              label={t('Take-home pay per payment')}
              value={state.pay}
              onChange={(v) => setSetting('pay', v)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t('Pay frequency')}
            <Select
              label={t('Pay frequency')}
              value={state.cadence}
              options={cadences.filter((c) => c !== 'One-time')}
              onChange={(v) => setSetting('cadence', v as Cadence)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t('Monthly savings target')}
            <MoneyInput
              label={t('Monthly savings target')}
              value={state.target}
              onChange={(v) => setSetting('target', v)}
            />
          </label>
        </div>
        <label className="mt-4 grid max-w-xs gap-1 text-sm">
          Currency (display only, no conversion)
          <Select
            label="Currency"
            value={state.currency}
            options={currencies.map((c): [string, string] => [
              c.code,
              `${c.code} · ${c.name}`,
            ])}
            onChange={(v) => setSetting('currency', v)}
          />
        </label>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.rollover}
            onChange={(e) => setSetting('rollover', e.target.checked)}
          />
          Carry unspent category budget into the next month
        </label>
      </Panel>
      <Panel
        title={t('Budget items')}
        subtitle="Use any category name. One-time costs belong to the month you select for that row."
        action={
          <AddButton ref={addRef} onClick={onAdd}>
            + Add item
          </AddButton>
        }
      >
        <div ref={tableRef}>
          <DataTable
            caption={t('Budget items')}
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
            rows={state.budget.map((r, i) => ({
              key: i,
              cells: [
                <TextInput
                  label="Item"
                  maxLength={120}
                  value={r.name}
                  onChange={(name) => updateRow('budget', i, { name })}
                />,
                <CategoryInput
                  extra={categories}
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
                fmt(monthly(r.amount, r.cadence, r.due, state.month)),
                <div className="flex items-center gap-2">
                  {r.cadence !== 'One-time' && r.amount !== '' && (
                    <button
                      type="button"
                      aria-label={`Make recurring: ${r.name || 'budget item'}`}
                      className="border-line rounded-lg border px-2 py-1 text-xs font-semibold"
                      onClick={() => {
                        setMoveMessage('')
                        setMoving({ index: i, start: state.month + '-01' })
                      }}
                    >
                      Make recurring
                    </button>
                  )}
                  <RemoveButton
                    label="budget item"
                    onClick={() => onRemove(i)}
                  />
                </div>,
              ],
            }))}
          />
        </div>
      </Panel>
      {moveMessage && (
        <p role="status" className="text-muted text-sm">
          {moveMessage}
        </p>
      )}
      {moving && (
        <ConfirmDialog
          open
          title="Move to recurring bills"
          confirmLabel="Move item"
          confirmDisabled={!moving.start}
          onClose={() => setMoving(null)}
          onConfirm={() => {
            setMoveMessage(
              moveBudgetToRecurring(moving.index, moving.start)
                ? 'Item moved to Recurring bills and income. It still counts in your monthly plan.'
                : 'The item could not be moved. Check the amount and first bill date.',
            )
          }}
        >
          <label className="grid gap-1">
            First bill date
            <input
              type="date"
              className="border-line bg-card rounded-lg border px-3 py-2"
              value={moving.start}
              onChange={(event) =>
                setMoving({ ...moving, start: event.target.value })
              }
            />
          </label>
        </ConfirmDialog>
      )}
      <RecurringPanel />
    </>
  )
}
