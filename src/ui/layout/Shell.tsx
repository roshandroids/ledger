import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useLedger } from '../../store/useLedger'
import { DownloadButton } from '../DownloadButton'
import { Notice } from '../components/Notice'
import { pages } from '../pages/pages'
import { usePwa } from '../../pwa'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function Shell() {
  const [navCollapsed, setNavCollapsed] = useState(false)
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const page = pages.find((p) => `/${p.path}` === pathname)
  const month = useLedger((s) => s.state.month)
  const canSave = useLedger((s) => s.canSave)
  const sample = useLedger((s) => s.state.sample)
  const setSetting = useLedger((s) => s.setSetting)
  const startBlank = useLedger((s) => s.startBlank)
  const { updateReady } = usePwa()
  if (!page) return <Navigate to="/overview" replace />
  return (
    <div
      className={`min-h-screen pb-20 md:grid md:pb-0 ${navCollapsed ? 'md:grid-cols-[72px_minmax(0,1fr)]' : 'md:grid-cols-[222px_minmax(0,1fr)]'}`}
    >
      <Sidebar
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed((value) => !value)}
      />
      <main className="min-w-0">
        <Topbar
          title={page.title}
          month={month}
          onMonthChange={(m) => setSetting('month', m)}
          showReportControls={page.path !== 'settings'}
          actions={<DownloadButton />}
        />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:gap-5 lg:p-7 xl:p-9">
          {!canSave && (
            <Notice>
              Browser storage is unavailable. Download Excel before closing this
              page.
            </Notice>
          )}
          {updateReady && (
            <Notice
              action={
                <button
                  onClick={() => location.reload()}
                  className="border-line rounded-lg border bg-card px-3 py-2 text-sm font-semibold"
                >
                  Reload
                </button>
              }
            >
              A new version of Ledger is ready.
            </Notice>
          )}
          {sample && (
            <Notice
              action={
                <button
                  onClick={startBlank}
                  className="border-line rounded-lg border bg-card px-3 py-2 text-sm font-semibold"
                >
                  Start blank
                </button>
              }
            >
              <strong>Sample budget</strong> · Edit these figures or start with
              an empty budget.
            </Notice>
          )}
          <motion.div
            key={pathname}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-5"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
