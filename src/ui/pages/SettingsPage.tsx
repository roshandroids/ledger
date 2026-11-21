import { Download } from 'lucide-react'
import { usePwa } from '../../pwa'
import { BackupPanel } from '../components/BackupPanel'
import { DrivePanel } from '../components/DrivePanel'
import { LockPanel } from '../components/LockPanel'
import { Panel } from '../components/Panel'
import { useTheme } from '../useTheme'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { canInstall, install } = usePwa()

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Appearance"
        subtitle="Choose how Ledger looks on this device."
      >
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="sr-only">Theme</legend>
          {(['system', 'light', 'dark'] as const).map((choice) => (
            <label
              key={choice}
              className="border-line has-checked:bg-surface flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium capitalize"
            >
              <input
                type="radio"
                name="theme"
                value={choice}
                checked={theme === choice}
                onChange={() => setTheme(choice)}
              />
              {choice}
            </label>
          ))}
        </fieldset>
      </Panel>
      <Panel
        title="Install Ledger"
        subtitle="Open Ledger from your home screen or desktop."
      >
        {canInstall ? (
          <button
            type="button"
            onClick={() => void install()}
            className="bg-nav inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            <Download size={16} aria-hidden="true" />
            Install app
          </button>
        ) : (
          <p className="text-muted text-sm">
            If Ledger is available to install, look for Install app or Add to
            Home Screen in your browser menu.
          </p>
        )}
      </Panel>
      <BackupPanel />
      <DrivePanel />
      <LockPanel />
    </div>
  )
}
