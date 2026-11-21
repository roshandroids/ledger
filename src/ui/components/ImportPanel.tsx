import { Download, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { parseCsv } from '../../import/csv'
import {
  guessMapping,
  loadSettings,
  mapRows,
  markDuplicates,
  rulesToText,
  saveSettings,
  textToRules,
  type DateFormat,
  type Mapping,
} from '../../import/mapping'
import { exportTransactionsCsv } from '../../import/exportCsv'
import { useLedger } from '../../store/useLedger'
import { DataTable } from './DataTable'
import { Panel } from './Panel'
import { Select } from './Select'
import { fmt } from '../format'

const btn =
  'border-line flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60'
const PREVIEW_ROWS = 20

export function ImportPanel() {
  const input = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<string[][] | null>(null)
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [rulesText, setRulesText] = useState(() =>
    rulesToText(loadSettings().rules),
  )
  const [msg, setMsg] = useState('')
  const [account, setAccount] = useState('')
  const accounts = useLedger((s) => s.state.accounts)
  const transactions = useLedger((s) => s.state.transactions)

  const candidates = useMemo(
    () =>
      rows && mapping
        ? markDuplicates(
            mapRows(rows, mapping, textToRules(rulesText)),
            transactions,
          )
        : [],
    [rows, mapping, rulesText, transactions],
  )
  const ready = candidates.filter((c) => !c.error && !c.duplicate)
  const dupes = candidates.filter((c) => c.duplicate).length
  const errors = candidates.filter((c) => c.error).length
  const header = rows?.[0] ?? []
  const signature = header.join('|')
  const columns: [string, string][] = [
    ['-1', 'Not used'],
    ...(rows?.[0] ?? []).map((h, i): [string, string] => [
      String(i),
      mapping?.hasHeader ? `${h || 'Column'} (${i + 1})` : `Column ${i + 1}`,
    ]),
  ]
  const set = (patch: Partial<Mapping>) =>
    setMapping((m) => (m ? { ...m, ...patch } : m))
  const col = (
    label: string,
    key: 'date' | 'description' | 'amount' | 'debit' | 'credit',
  ) => (
    <label className="grid gap-1 text-sm">
      {label}
      <Select
        label={label}
        value={String(mapping?.[key] ?? -1)}
        options={columns}
        onChange={(v) => set({ [key]: Number(v) })}
      />
    </label>
  )

  async function pick(file: File | undefined) {
    if (!file) return
    const parsed = parseCsv(await file.text())
    if (input.current) input.current.value = ''
    if (parsed.length === 0) {
      setMsg('That file has no rows.')
      return
    }
    const saved = loadSettings()
    const sig = parsed[0].join('|')
    setRows(parsed)
    setMapping(
      saved.mapping && saved.signature === sig
        ? saved.mapping
        : guessMapping(parsed),
    )
    setMsg('')
  }

  function commit() {
    if (!mapping) return
    const rules = textToRules(rulesText)
    saveSettings({ rules, mapping, signature })
    useLedger
      .getState()
      .addTransactions(
        ready.map((c) => (account ? { ...c.tx, account } : c.tx)),
      )
    setMsg(
      `Imported ${ready.length} transaction${ready.length === 1 ? '' : 's'}` +
        (dupes ? `, skipped ${dupes} already in your ledger` : '') +
        '.',
    )
    setRows(null)
    setMapping(null)
  }

  return (
    <Panel
      title="Import and export"
      subtitle="Import a bank CSV in your browser; nothing is uploaded. Rows already in your ledger are skipped."
      action={
        <div className="flex gap-2">
          <button className={btn} onClick={() => input.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Import CSV
          </button>
          <button className={btn} onClick={exportTransactionsCsv}>
            <Download size={16} aria-hidden="true" /> Export CSV
          </button>
        </div>
      }
    >
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        aria-label="CSV file"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <label className="grid gap-1 text-sm">
        Auto-categorize rules, one per line as <code>keyword = Category</code>
        <textarea
          aria-label="Category rules"
          rows={3}
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          onBlur={() =>
            saveSettings({ ...loadSettings(), rules: textToRules(rulesText) })
          }
          placeholder="tim hortons = Coffee"
          className="border-line rounded-lg border px-3 py-2"
        />
      </label>
      {rows && mapping && (
        <div className="mt-4 grid gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mapping.hasHeader}
              onChange={(e) => set({ hasHeader: e.target.checked })}
            />
            First row is a header
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {col('Date column', 'date')}
            {col('Description column', 'description')}
            {col('Amount column', 'amount')}
            {col('Debit column', 'debit')}
            {col('Credit column', 'credit')}
            <label className="grid gap-1 text-sm">
              Date format
              <Select
                label="Date format"
                value={mapping.dateFormat}
                options={[
                  ['ymd', 'Year-month-day'],
                  ['mdy', 'Month/day/year'],
                  ['dmy', 'Day/month/year'],
                ]}
                onChange={(v) => set({ dateFormat: v as DateFormat })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Money out is shown as
              <Select
                label="Money out sign"
                value={mapping.expenseSign}
                options={[
                  ['negative', 'Negative amounts'],
                  ['positive', 'Positive amounts'],
                ]}
                onChange={(v) =>
                  set({ expenseSign: v as Mapping['expenseSign'] })
                }
              />
            </label>
          </div>
          {accounts.length > 0 && (
            <label className="grid max-w-xs gap-1 text-sm">
              Import into account
              <Select
                label="Import into account"
                value={account}
                options={[
                  ['', 'Default account'],
                  ...accounts.map((a): [string, string] => [
                    a.id,
                    a.name || 'Unnamed account',
                  ]),
                ]}
                onChange={setAccount}
              />
            </label>
          )}
          <p role="status" className="text-sm">
            {ready.length} ready · {dupes} already in your ledger · {errors}{' '}
            with errors
          </p>
          <DataTable
            caption="Import preview"
            headers={['Date', 'Type', 'Category', 'Amount', 'Notes', 'Problem']}
            empty="No rows to preview."
            rows={candidates.slice(0, PREVIEW_ROWS).map((c, i) => ({
              key: i,
              cells: [
                c.tx.date || '—',
                c.tx.type,
                c.tx.category || '—',
                c.tx.amount === '' ? '—' : fmt(Number(c.tx.amount)),
                c.tx.notes || '—',
                c.error ?? (c.duplicate ? 'Already imported' : '—'),
              ],
            }))}
          />
          {candidates.length > PREVIEW_ROWS && (
            <p className="text-muted text-sm">
              Showing the first {PREVIEW_ROWS} of {candidates.length} rows.
            </p>
          )}
          <div className="flex gap-3">
            <button
              className={btn}
              disabled={ready.length === 0}
              onClick={commit}
            >
              Import {ready.length} transaction{ready.length === 1 ? '' : 's'}
            </button>
            <button
              className={btn}
              onClick={() => {
                setRows(null)
                setMapping(null)
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <p role="status" className="text-muted mt-3 text-sm">
        {msg}
      </p>
    </Panel>
  )
}
