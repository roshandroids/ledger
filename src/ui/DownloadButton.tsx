import { useState } from 'react'
import { useLedger } from '../store/useLedger'

export function DownloadButton() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function download() {
    setBusy(true)
    setMsg('Preparing workbook…')
    try {
      const { state } = useLedger.getState()
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
      setMsg('Could not create the workbook. Try downloading again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button
        onClick={download}
        disabled={busy}
        className="bg-nav rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <span aria-hidden="true">↓</span> Download Excel
      </button>
      <span role="status" className="sr-only">
        {msg}
      </span>
    </>
  )
}
