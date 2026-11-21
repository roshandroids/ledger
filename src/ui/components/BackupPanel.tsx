import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  backupFileName,
  parseBackup,
  serializeBackup,
} from '../../storage/backup'
import type { State } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { ConfirmDialog } from './ConfirmDialog'
import { Panel } from './Panel'

const btn =
  'border-line flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold'

export function BackupPanel() {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<State | null>(null)
  const [msg, setMsg] = useState('')

  function exportJson() {
    const url = URL.createObjectURL(
      new Blob([serializeBackup(useLedger.getState().state)], {
        type: 'application/json',
      }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setMsg('Backup downloaded.')
  }

  async function pick(file: File | undefined) {
    if (!file) return
    const state = parseBackup(await file.text())
    if (state) setPending(state)
    else setMsg('That file is not a Ledger backup.')
    if (input.current) input.current.value = ''
  }

  return (
    <Panel
      title="Backup and restore"
      subtitle="Your data lives only in this browser. Save a backup file to keep it safe or move it to another device."
    >
      <div className="flex flex-wrap gap-3">
        <button className={btn} onClick={exportJson}>
          <Download size={16} aria-hidden="true" /> Download backup
        </button>
        <button className={btn} onClick={() => input.current?.click()}>
          <Upload size={16} aria-hidden="true" /> Restore from file
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          aria-label="Backup file"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      <p role="status" className="text-muted mt-3 text-sm">
        {msg}
      </p>
      <ConfirmDialog
        open={pending !== null}
        title="Replace your budget?"
        confirmLabel="Replace"
        onConfirm={() => {
          if (pending) useLedger.getState().replaceState(pending)
          setMsg('Backup restored.')
        }}
        onClose={() => setPending(null)}
      >
        Restoring replaces everything currently in this browser. Download a
        backup first if you want to keep it.
      </ConfirmDialog>
    </Panel>
  )
}
