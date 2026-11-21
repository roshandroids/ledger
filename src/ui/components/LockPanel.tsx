import { useState } from 'react'
import { MIN_LENGTH } from '../../lock/passcode'
import { useLock } from '../../lock/useLock'
import { Panel } from './Panel'

const btn =
  'border-line rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50'
const field = 'border-line rounded-lg border px-3 py-2'

export function LockPanel() {
  const enabled = useLock((s) => s.record !== null)
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [msg, setMsg] = useState('')
  const reset = () => {
    setPin('')
    setAgain('')
  }
  return (
    <Panel
      title="App lock"
      subtitle="Hides Ledger on this device until you enter a passcode. It is not encryption: anyone who can open this browser's storage can still read your data, so keep a backup."
    >
      <div className="flex flex-wrap items-end gap-3">
        <input
          type="password"
          autoComplete="new-password"
          aria-label={enabled ? 'Current passcode' : 'New passcode'}
          placeholder={enabled ? 'Current passcode' : 'New passcode'}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={field}
        />
        {enabled ? (
          <>
            <button className={btn} onClick={() => useLock.getState().lock()}>
              Lock now
            </button>
            <button
              className={btn}
              onClick={async () => {
                const ok = await useLock.getState().disable(pin)
                setMsg(ok ? 'Lock removed.' : 'Wrong passcode.')
                reset()
              }}
            >
              Remove lock
            </button>
          </>
        ) : (
          <>
            <input
              type="password"
              autoComplete="new-password"
              aria-label="Repeat passcode"
              placeholder="Repeat passcode"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              className={field}
            />
            <button
              className={btn}
              disabled={pin.length < MIN_LENGTH || pin !== again}
              onClick={async () => {
                const ok = await useLock.getState().enable(pin)
                setMsg(ok ? 'Lock is on.' : 'Could not save the lock.')
                reset()
              }}
            >
              Turn on lock
            </button>
          </>
        )}
      </div>
      <p role="status" className="text-muted mt-2 text-sm">
        {msg || (enabled ? '' : `Use at least ${MIN_LENGTH} characters.`)}
      </p>
    </Panel>
  )
}
