import { useState } from 'react'
import { ConfirmDialog } from '../ui/components/ConfirmDialog'
import { useLock } from './useLock'

export function LockScreen() {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  const [erase, setErase] = useState(false)
  const unlock = useLock((s) => s.unlock)
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <form
        className="border-line bg-card grid w-full max-w-sm gap-4 rounded-xl border p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          setWrong(!(await unlock(pin)))
          setPin('')
        }}
      >
        <h1 className="text-xl font-semibold">Ledger is locked</h1>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          aria-label="Passcode"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="border-line w-full rounded-lg border px-3 py-2"
        />
        {wrong && (
          <p role="alert" className="text-negative text-sm">
            Wrong passcode.
          </p>
        )}
        <button
          type="submit"
          className="bg-nav rounded-lg px-3 py-2 text-sm font-semibold text-white"
        >
          Unlock
        </button>
        <button
          type="button"
          className="text-muted text-sm underline"
          onClick={() => setErase(true)}
        >
          Forgot passcode?
        </button>
      </form>
      {erase && (
        <ConfirmDialog
          open
          title="Erase data on this device?"
          confirmLabel="Erase everything"
          onConfirm={() => useLock.getState().eraseEverything()}
          onClose={() => setErase(false)}
        >
          The passcode cannot be recovered. This deletes the budget stored in
          this browser and turns the lock off. You can restore a backup file or
          Google Drive copy afterwards.
        </ConfirmDialog>
      )}
    </main>
  )
}
