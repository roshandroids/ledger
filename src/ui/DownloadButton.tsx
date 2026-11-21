import { useTranslation } from './i18n'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDown, Download } from 'lucide-react'
import { panelClass } from './components/popover'
import { useState } from 'react'
import { useLedger } from '../store/useLedger'

export function DownloadButton() {
  const t = useTranslation()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function download(format: 'excel' | 'pdf') {
    const pdf = format === 'pdf'
    setBusy(true)
    setMsg(pdf ? 'Preparing PDF…' : 'Preparing workbook…')
    try {
      const { state } = useLedger.getState()
      if (pdf) {
        const { statementPdf } = await import('../export/statement')
        statementPdf(state).save(`Ledger-Statement-${state.month}.pdf`)
        setMsg('PDF statement download started.')
        return
      }
      const { workbookBlob } = await import('../export/workbook')
      const url = URL.createObjectURL(await workbookBlob(state))
      const a = document.createElement('a')
      a.href = url
      a.download = `Ledger-${state.month}.xlsx`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      setMsg('Excel workbook downloaded.')
    } catch (e) {
      console.error(e)
      setMsg('Could not create the download. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Menu>
        <MenuButton
          disabled={busy}
          className="bg-action hover:bg-nav inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Download size={16} aria-hidden="true" />
          {t('Download')}
          <ChevronDown size={14} aria-hidden="true" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          transition
          className={`${panelClass} w-52 p-1`}
        >
          <MenuItem>
            <button
              type="button"
              onClick={() => void download('excel')}
              className="data-[focus]:bg-surface block w-full rounded-lg px-3 py-2 text-start text-sm"
            >
              {t('Excel workbook (.xlsx)')}
            </button>
          </MenuItem>
          <MenuItem>
            <button
              type="button"
              onClick={() => void download('pdf')}
              className="data-[focus]:bg-surface block w-full rounded-lg px-3 py-2 text-start text-sm"
            >
              {t('Monthly statement (.pdf)')}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
      <span role="status" className="sr-only">
        {msg}
      </span>
    </>
  )
}
