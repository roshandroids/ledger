import { Cloud, CloudDownload, Mail } from 'lucide-react'
import { useState } from 'react'
import {
  clientId,
  getAccessToken,
  getGmailToken,
  loadLatestBackup,
  saveToDrive,
  sendEmail,
  type DriveKind,
} from '../../drive/google'
import type { State } from '../../domain'
import {
  backupFileName,
  parseBackup,
  serializeBackup,
} from '../../storage/backup'
import { useLedger } from '../../store/useLedger'
import { ConfirmDialog } from './ConfirmDialog'
import { Panel } from './Panel'
import { TextInput } from './TextInput'

const EMAIL_KEY = 'ledger-email-to'
const readEmail = () => {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

const btn =
  'border-line flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60'

export function DrivePanel() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [link, setLink] = useState<string>()
  const [pending, setPending] = useState<State | null>(null)
  const [email, setEmail] = useState(readEmail)

  async function restore() {
    if (!clientId) return
    setBusy(true)
    setLink(undefined)
    setMsg('Looking for a backup in Google Drive…')
    try {
      const text = await loadLatestBackup(await getAccessToken(clientId))
      const state = text === null ? null : parseBackup(text)
      if (state) {
        setPending(state)
        setMsg('')
      } else
        setMsg(
          text === null
            ? 'No Ledger backup found in your Drive.'
            : 'The newest Drive file is not a Ledger backup.',
        )
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read Google Drive.')
    } finally {
      setBusy(false)
    }
  }

  async function mail() {
    if (!clientId) return
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setMsg('Enter a valid email address.')
    setBusy(true)
    setLink(undefined)
    setMsg('Sending email…')
    try {
      try {
        localStorage.setItem(EMAIL_KEY, email)
      } catch {
        // storage unavailable: the address just isn't remembered
      }
      const { state } = useLedger.getState()
      const { emailContent } = await import('../../export/emailBody')
      const { statementPdf } = await import('../../export/statement')
      const { subject, ...body } = emailContent(state)
      await sendEmail(await getGmailToken(clientId), email, subject, body, [
        {
          name: `Ledger-${state.month}.xlsx`,
          mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          blob: await (
            await import('../../export/workbook')
          ).workbookBlob(state),
        },
        {
          name: `Ledger-Statement-${state.month}.pdf`,
          mime: 'application/pdf',
          blob: statementPdf(state).output('blob'),
        },
      ])
      setMsg(`Emailed to ${email}.`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not send the email.')
    } finally {
      setBusy(false)
    }
  }

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
      title="Google Drive & email"
      subtitle="Sign in with Google to save your workbook or backup to your own Drive, or email the workbook and PDF to yourself. Ledger can only see files it creates."
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
          <button className={btn} disabled={busy} onClick={restore}>
            <CloudDownload size={16} aria-hidden="true" /> Restore from Drive
          </button>
          <div className="flex w-full flex-wrap gap-3">
            <div className="min-w-56 flex-1">
              <TextInput
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={setEmail}
              />
            </div>
            <button className={btn} disabled={busy} onClick={mail}>
              <Mail size={16} aria-hidden="true" /> Email report to me
            </button>
          </div>
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
      {pending && (
        <ConfirmDialog
          open
          title="Replace your budget?"
          confirmLabel="Replace"
          onConfirm={() => {
            useLedger.getState().replaceState(pending)
            setMsg('Backup restored from Google Drive.')
          }}
          onClose={() => setPending(null)}
        >
          Restoring replaces everything currently in this browser. Save a backup
          first if you want to keep it.
        </ConfirmDialog>
      )}
    </Panel>
  )
}
