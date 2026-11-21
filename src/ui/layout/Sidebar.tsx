import { motion } from 'motion/react'
import { NavLink } from 'react-router'
import { pages } from '../pages/pages'

/** Bottom tab bar on phones; sticky side rail from md up. */
export function Sidebar() {
  return (
    <aside className="bg-nav fixed inset-x-0 bottom-0 z-20 border-t border-white/10 text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-t-0 md:px-5 md:pt-9 md:pb-6">
      <NavLink
        to="/overview"
        className="hidden items-center px-2 text-2xl font-bold tracking-tight md:flex"
      >
        <span
          aria-hidden="true"
          className="bg-mint mr-3 flex h-8 w-8 items-end gap-0.5 rounded-lg p-2"
        >
          <i className="bg-nav h-1.5 w-1 rounded-sm" />
          <i className="bg-nav h-2.5 w-1 rounded-sm" />
          <i className="bg-nav h-4 w-1 rounded-sm" />
        </span>
        Ledger<span className="text-mint">.</span>
      </NavLink>
      <nav
        aria-label="Budget workspace"
        className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)] md:mt-12 md:grid-cols-1 md:gap-2 md:pb-0"
      >
        {pages.map((p) => (
          <NavLink
            key={p.path}
            to={`/${p.path}`}
            className="aria-[current=page]:text-mint relative isolate flex flex-col items-center gap-1 px-1 py-2 text-[0.7rem] font-semibold text-slate-300 md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-3 md:text-sm"
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
                {p.nav}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto hidden items-center gap-2 border-t border-slate-600 pt-4 text-xs text-slate-300 md:flex">
        <strong className="rounded bg-slate-700 px-1.5 py-1 text-[0.7rem]">
          CAD
        </strong>
        <span>Saved on this device</span>
      </div>
    </aside>
  )
}
