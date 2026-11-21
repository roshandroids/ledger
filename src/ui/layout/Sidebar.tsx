import { NavLink } from 'react-router'
import { pages } from '../pages/pages'

export function Sidebar() {
  return (
    <aside className="bg-nav flex flex-col p-5 text-white md:sticky md:top-0 md:h-screen md:px-5 md:pt-9 md:pb-6">
      <NavLink
        to="/overview"
        className="flex items-center px-2 text-2xl font-bold tracking-tight"
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
        className="mt-6 flex gap-2 overflow-x-auto md:mt-12 md:grid"
      >
        {pages.map((p) => (
          <NavLink
            key={p.path}
            to={`/${p.path}`}
            className="aria-[current=page]:bg-nav-active aria-[current=page]:text-mint hover:bg-nav-hover flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold whitespace-nowrap text-slate-300"
          >
            <span
              aria-hidden="true"
              className="w-5 text-center text-xl leading-none"
            >
              {p.icon}
            </span>
            {p.nav}
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
