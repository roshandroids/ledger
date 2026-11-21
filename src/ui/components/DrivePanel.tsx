import { Cloud } from 'lucide-react'
import { useState } from 'react'
import {
  clientId,
  getAccessToken,
  saveToDrive,
  type DriveKind,
} from '../../drive/google'
import { backupFileName, serializeBackup } from '../../storage/backup'
import { useLedger } from '../../store/useLedger'
import { Panel } from './Panel'

const btn =
  'border-line flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60'

export function DrivePanel() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [link, setLink] = useState<string>()

  async function save(kind: DriveKind) {
    if (!clientId) return
    setBusy(true)
    setLink(undefined)
    setMsg('Saving to Google Drive…')
    try {
      const { state } = useLedger.getState()
      const token = await getAccessToken(clientId)
      const file =
        kind === 'excel'
          ? await saveToDrive(
              token,
              kind,
              `Ledger-${state.month}.xlsx`,
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              await (await import('../../export/workbook')).workbookBlob(state),
            )
          : await saveToDrive(
              token,
              kind,
              backupFileName(),
              'application/json',
              new Blob([serializeBackup(state)], { type: 'application/json' }),
            )
      setLink(file.webViewLink)
      setMsg('Saved to Google Drive.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not save to Google Drive.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title="Google Drive"
      subtitle="Sign in with Google to save your workbook or backup to your own Drive. Ledger can only see files it creates."
    >
      {clientId ? (
        <div className="flex flex-wrap gap-3">
          <button className={btn} disabled={busy} onClick={() => save('excel')}>
            <Cloud size={16} aria-hidden="true" /> Save Excel to Drive
          </button>
          <button
            className={btn}
            disabled={busy}
            onClick={() => save('backup')}
          >
            <Cloud size={16} aria-hidden="true" /> Save backup to Drive
          </button>
        </div>
      ) : (
        <p className="text-muted text-sm">
          Not configured. Set <code>VITE_GOOGLE_CLIENT_ID</code> (see README) to
          enable this.
        </p>
      )}
      <p role="status" className="text-muted mt-3 text-sm">
        {msg}{' '}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-actual underline"
          >
            Open in Drive
          </a>
        )}
      </p>
    </Panel>
  )
}
