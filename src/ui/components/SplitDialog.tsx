import { useState } from 'react'
import { splitParts } from '../../domain'
import type { Split, Transaction } from '../../domain'
import { fmt } from '../format'
import { ConfirmDialog } from './ConfirmDialog'
import { MoneyInput } from './MoneyInput'
import { TextInput } from './TextInput'

/** Files part of a transaction under other categories; the remainder keeps the row's category. */
export function SplitDialog({
  tx,
  onSave,
  onClose,
}: {
  tx: Transaction
  onSave(splits: Split[]): void
  onClose(): void
}) {
  const [rows, setRows] = useState<Split[]>(
    tx.splits?.length ? tx.splits : [{ category: '', amount: '' }],
  )
  const draft = { ...tx, splits: rows }
  const parts = splitParts(draft)
  const bad = parts.length === 1 && rows.some((r) => Number(r.amount) > 0)
  const remainder = parts.at(-1)!.amount
  const edit = (i: number, patch: Partial<Split>) =>
    setRows((cur) => cur.map((r, n) => (n === i ? { ...r, ...patch } : r)))
  return (
    <ConfirmDialog
      open
      title="Split transaction"
      confirmLabel="Save split"
      onConfirm={() => onSave(rows.filter((r) => Number(r.amount) > 0))}
      onClose={onClose}
    >
      <div className="grid gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextInput
              label="Split category"
              list="category-list"
              value={r.category}
              onChange={(category) => edit(i, { category })}
            />
            <MoneyInput
              label="Split amount"
              value={r.amount}
              onChange={(amount) => edit(i, { amount })}
            />
            <button
              className="border-line rounded-lg border px-2 py-2"
              aria-label="Remove split"
              onClick={() => setRows((cur) => cur.filter((_, n) => n !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="border-line w-fit rounded-lg border px-3 py-2 text-sm font-semibold"
          onClick={() =>
            setRows((cur) => [...cur, { category: '', amount: '' }])
          }
        >
          + Add split
        </button>
        <p role="status" className={bad ? 'text-negative' : 'text-muted'}>
          {bad
            ? `Splits exceed the amount of ${fmt(Number(tx.amount) || 0)}.`
            : `${fmt(remainder)} stays in ${tx.category.trim() || 'Uncategorized'}.`}
        </p>
      </div>
    </ConfirmDialog>
  )
}
