import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { goalTypes, transactionTypes } from '../../domain'
import type { TransactionType } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { AddButton, RemoveButton } from '../components/AddButton'
import { CategoryInput } from '../components/CategoryInput'
import { CategoryDatalist } from '../components/CategoryDatalist'
import { DatePicker } from '../components/DatePicker'
import { DataTable } from '../components/DataTable'
import { ImportPanel } from '../components/ImportPanel'
import { MoneyInput } from '../components/MoneyInput'
import { Panel } from '../components/Panel'
import { Select } from '../components/Select'
import { TextInput } from '../components/TextInput'
import { useRowFocus } from '../useRowFocus'
import {
  emptyFilter,
  filterTransactions,
  isFiltered,
  NONE,
  parseFilter,
  toParams,
  type SortKey,
  type TxFilter,
} from '../txFilter'

const sortOptions: [SortKey, string][] = [
  ['entry', 'Order entered'],
  ['date-desc', 'Newest first'],
  ['date-asc', 'Oldest first'],
  ['amount-desc', 'Largest first'],
  ['amount-asc', 'Smallest first'],
  ['category', 'Category A-Z'],
]
const btn = 'border-line rounded-lg border px-3 py-2 text-sm font-semibold'

export function TransactionsPage() {
  const state = useLedger((s) => s.state)
  const { addRow, updateRow, removeRow } = useLedger.getState()
  const [params, setParams] = useSearchParams()
  const filter = useMemo(() => parseFilter(params), [params])
  const setFilter = (patch: Partial<TxFilter>) =>
    setParams(toParams({ ...filter, ...patch }), { replace: true })
  const [selected, setSelected] = useState<number[]>([])
  const [bulkCategory, setBulkCategory] = useState('')
  const view = useMemo(
    () => filterTransactions(state.transactions, filter),
    [state.transactions, filter],
  )
  const categories = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of state.transactions) {
      const c = t.category.trim()
      if (c && !seen.has(c.toLocaleLowerCase('en-CA')))
        seen.set(c.toLocaleLowerCase('en-CA'), c)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'en-CA'))
  }, [state.transactions])
  // A new blank row would be hidden by an active filter or sort, so show everything first.
  const rowFocus = useRowFocus(
    () => {
      setParams({}, { replace: true })
      setSelected([])
      addRow('transactions')
    },
    (i) => {
      setSelected([])
      return removeRow('transactions', i)
    },
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
    <>
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
        {state.transactions.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TextInput
              label="Search transactions"
              placeholder="Search category or notes"
              value={filter.q}
              onChange={(q) => setFilter({ q })}
            />
            <Select
              label="Filter by type"
              value={filter.type}
              options={[['', 'All types'], ...transactionTypes]}
              onChange={(v) => setFilter({ type: v as TxFilter['type'] })}
            />
            <Select
              label="Filter by category"
              value={filter.category}
              options={[
                ['', 'All categories'],
                [NONE, 'Uncategorized'],
                ...categories,
              ]}
              onChange={(category) => setFilter({ category })}
            />
            <Select
              label="Sort by"
              value={filter.sort}
              options={sortOptions}
              onChange={(v) => setFilter({ sort: v as SortKey })}
            />
            <DatePicker
              label="From date"
              value={filter.from}
              onChange={(from) => setFilter({ from })}
            />
            <DatePicker
              label="To date"
              value={filter.to}
              onChange={(to) => setFilter({ to })}
            />
            <MoneyInput
              label="Minimum amount"
              allowNegative
              placeholder="Min amount"
              value={filter.min}
              onChange={(min) => setFilter({ min })}
            />
            <MoneyInput
              label="Maximum amount"
              allowNegative
              placeholder="Max amount"
              value={filter.max}
              onChange={(max) => setFilter({ max })}
            />
          </div>
        )}
        {state.transactions.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span role="status" className="text-muted">
              Showing {view.length} of {state.transactions.length}
            </span>
            {isFiltered(filter) && (
              <button
                className={btn}
                onClick={() => setFilter({ ...emptyFilter, sort: filter.sort })}
              >
                Clear filters
              </button>
            )}
            {selected.length > 0 && (
              <>
                <span className="text-muted">{selected.length} selected</span>
                <div className="w-40">
                  <TextInput
                    label="Category for selected"
                    placeholder="Category"
                    list="category-list"
                    value={bulkCategory}
                    onChange={setBulkCategory}
                  />
                </div>
                <button
                  className={btn}
                  disabled={bulkCategory.trim() === ''}
                  onClick={() => {
                    useLedger
                      .getState()
                      .recategorize(selected, bulkCategory.trim())
                    setSelected([])
                    setBulkCategory('')
                  }}
                >
                  Set category
                </button>
                <button
                  className={btn + ' text-negative'}
                  onClick={() => {
                    useLedger.getState().removeTransactions(selected)
                    setSelected([])
                  }}
                >
                  Delete selected
                </button>
              </>
            )}
          </div>
        )}
        <div ref={tableRef}>
          <DataTable
            caption="Transactions"
            emptyIllustration="/brand/transactions.webp"
            headers={[
              'Select',
              'Date',
              'Type',
              'Category',
              'Amount',
              'Savings goal',
              'Notes',
              '',
            ]}
            empty={
              state.transactions.length > 0
                ? 'No transactions match these filters.'
                : 'No transactions yet. Add income, expenses or a transfer.'
            }
            rows={view.map(({ tx: t, index: i }) => ({
              key: i,
              cells: [
                <input
                  type="checkbox"
                  aria-label="Select transaction"
                  checked={selected.includes(i)}
                  onChange={(e) =>
                    setSelected((cur) =>
                      e.target.checked
                        ? [...cur, i]
                        : cur.filter((n) => n !== i),
                    )
                  }
                />,
                <DatePicker
                  label="Date"
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
                  onChange={(amount) =>
                    updateRow('transactions', i, { amount })
                  }
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
                <RemoveButton
                  label="transaction"
                  onClick={() => onRemove(i)}
                />,
              ],
            }))}
          />
        </div>
      </Panel>
      <ImportPanel />
    </>
  )
}
