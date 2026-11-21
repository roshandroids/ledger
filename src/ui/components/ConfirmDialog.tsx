import { useTranslation } from '../i18n'
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  confirmDisabled?: boolean
  /** Omit for an informational dialog with a single OK button. */
  onConfirm?(): void
  onClose(): void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  confirmDisabled = false,
  onConfirm,
  onClose,
}: Props) {
  const t = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      if (d.showModal) d.showModal()
      else d.setAttribute('open', '')
    }
    if (!open && d.open) {
      if (d.close) d.close()
      else d.removeAttribute('open')
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby="dlg-title"
      onClose={onClose}
      className="bg-card text-ink m-auto rounded-xl p-6"
    >
      <h2 id="dlg-title" className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-2 text-sm">{children}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="border-line rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          {onConfirm ? t('Cancel') : 'OK'}
        </button>
        {onConfirm && (
          <button
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="bg-nav rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        )}
      </div>
    </dialog>
  )
}
