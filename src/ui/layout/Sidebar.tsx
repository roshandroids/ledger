import { useTranslation } from '../i18n'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { motion } from 'motion/react'
import { NavLink } from 'react-router'
import { useLedger } from '../../store/useLedger'
import { pages } from '../pages/pages'

/** Bottom tab bar on phones; sticky side rail from md up. */
export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle(): void
}) {
  const t = useTranslation()
  const currency = useLedger((s) => s.state.currency)
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <aside
      className={`bg-nav fixed inset-x-0 bottom-0 z-20 border-t border-white/10 text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-t-0 md:pt-8 md:pb-6 ${collapsed ? 'md:px-2' : 'md:px-5'}`}
    >
      <div
        className={`hidden items-center md:flex ${collapsed ? 'flex-col gap-3' : 'justify-between gap-2'}`}
      >
        <NavLink to="/overview" aria-label={t('Ledger overview')}>
          <img
            src={
              collapsed
                ? '/brand/ledger-launcher-192.png'
                : '/brand/ledger-logo.png'
            }
            alt=""
            className={collapsed ? 'h-9 w-9 rounded-md' : 'h-auto w-32'}
          />
        </NavLink>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls="workspace-navigation"
          aria-label={t(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          title={t(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          className="hover:bg-nav-hover grid size-9 shrink-0 place-items-center rounded-lg text-slate-300"
        >
          <ToggleIcon size={19} aria-hidden="true" />
        </button>
      </div>
      <nav
        id="workspace-navigation"
        aria-label={t('Budget workspace')}
        className={`grid grid-cols-7 pb-[env(safe-area-inset-bottom)] md:grid-cols-1 md:gap-2 md:pb-0 ${collapsed ? 'md:mt-5' : 'md:mt-10'}`}
      >
        {pages.map((p) => (
          <NavLink
            key={p.path}
            aria-label={t(p.nav)}
            title={collapsed ? t(p.nav) : undefined}
            to={`/${p.path}`}
            className={`aria-[current=page]:text-mint relative isolate flex flex-col items-center gap-1 px-1 py-2 text-[0.65rem] font-semibold text-slate-300 md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-3 md:text-sm ${collapsed ? 'md:justify-center' : ''}`}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="bg-nav-active absolute inset-x-2 inset-y-1 -z-10 rounded-lg md:inset-0"
                  />
                )}
                <p.icon size={20} aria-hidden="true" />
                <span
                  className={`max-[600px]:hidden ${collapsed ? 'md:hidden' : 'md:inline'}`}
                >
                  {t(p.nav)}
                </span>
                <span aria-hidden="true" className="hidden max-[600px]:inline">
                  {t(
                    p.path === 'transactions'
                      ? 'Trans'
                      : p.path === 'goals'
                        ? 'Goals'
                        : p.nav,
                  )}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div
        className={`mt-auto hidden items-center gap-2 border-t border-slate-600 pt-4 text-xs text-slate-300 md:flex ${collapsed ? 'justify-center' : ''}`}
      >
        <strong className="rounded bg-slate-700 px-1.5 py-1 text-[0.7rem]">
          {currency}
        </strong>
        <span className={collapsed ? 'sr-only' : undefined}>
          {t('Saved on this device')}
        </span>
      </div>
    </aside>
  )
}
