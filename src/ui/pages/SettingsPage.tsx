import { useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { usePwa } from '../../pwa'
import { resetLocalLedger } from '../../storage/resetLocalLedger'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { BackupPanel } from '../components/BackupPanel'
import { DrivePanel } from '../components/DrivePanel'
import { LockPanel } from '../components/LockPanel'
import { Panel } from '../components/Panel'
import { useTranslation } from '../i18n'
import {
  fontLabels,
  fonts,
  languageOptions,
  languages,
  paletteLabels,
  palettes,
  usePreferences,
} from '../preferences'
import { useTheme } from '../useTheme'

export function SettingsPage() {
  const t = useTranslation()
  const { palette, font, language, setPreference } = usePreferences()
  const { theme, setTheme } = useTheme()
  const { canInstall, install } = usePwa()

  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')

  async function reset() {
    setResetting(true)
    setResetError('')
    try {
      await resetLocalLedger()
      location.replace('/overview')
    } catch (error) {
      setResetError(
        error instanceof Error
          ? error.message
          : 'Ledger could not reset this device.',
      )
      setResetting(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title={t('Appearance')}
        subtitle={t('Choose how Ledger looks on this device.')}
      >
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="sr-only">{t('Theme')}</legend>
          {(['system', 'light', 'dark'] as const).map((choice, index) => (
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
              {t(['System', 'Light', 'Dark'][index])}
            </label>
          ))}
        </fieldset>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold">
              {t('Color palette')}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {palettes.map((choice) => (
                <label
                  key={choice}
                  className="border-line has-checked:bg-surface flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="palette"
                    checked={palette === choice}
                    onChange={() => setPreference('palette', choice)}
                  />
                  <span
                    className="size-3 shrink-0 rounded-full"
                    aria-hidden="true"
                    style={{
                      backgroundColor: paletteLabels[choice][1],
                    }}
                  />
                  <span className="wrap-anywhere">
                    {t(paletteLabels[choice][0])}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1 text-sm">
            {t('Font')}
            <select
              className="border-line rounded-lg border px-3 py-2"
              aria-label={t('Font')}
              value={font}
              onChange={(event) => {
                const choice = fonts.find((item) => item === event.target.value)
                if (choice) setPreference('font', choice)
              }}
            >
              {fonts.map((choice) => (
                <option key={choice} value={choice}>
                  {t(fontLabels[choice])}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t('Language')}
            <select
              className="border-line rounded-lg border px-3 py-2"
              aria-label={t('Language')}
              value={language}
              onChange={(event) => {
                const choice = languages.find(
                  (item) => item === event.target.value,
                )
                if (choice) setPreference('language', choice)
              }}
            >
              {languages.map((choice) => (
                <option lang={choice} key={choice} value={choice}>
                  {languageOptions[choice].name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>
      <Panel
        title={t('Install Ledger')}
        subtitle={t('Open Ledger from your home screen or desktop.')}
      >
        {canInstall ? (
          <button
            type="button"
            onClick={() => void install()}
            className="bg-nav inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            <Download size={16} aria-hidden="true" />
            {t('Install app')}
          </button>
        ) : (
          <p className="text-muted text-sm">
            {t(
              'If Ledger is available to install, look for Install app or Add to Home Screen in your browser menu.',
            )}
          </p>
        )}
      </Panel>
      <BackupPanel />
      <DrivePanel />
      <LockPanel />
      <Panel
        title={t('Start fresh')}
        subtitle={t(
          'Clear Ledger’s offline cache and reset its data on this device.',
        )}
      >
        <button
          type="button"
          disabled={resetting}
          onClick={() => setConfirmReset(true)}
          className="border-negative text-negative inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          <RotateCcw size={16} aria-hidden="true" />
          {resetting
            ? t('Resetting Ledger…')
            : t('Clear cache and start fresh')}
        </button>
        {resetError && (
          <p role="alert" className="text-negative mt-2 text-sm">
            {resetError}
          </p>
        )}
      </Panel>
      {confirmReset && (
        <ConfirmDialog
          open
          title={t('Erase Ledger data on this device?')}
          confirmLabel={t('Erase local data')}
          onClose={() => setConfirmReset(false)}
          onConfirm={() => void reset()}
        >
          {t(
            'This erases your budget, transactions, accounts, goals, and preferences on this device. Exported files and Google Drive backups are kept.',
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}
