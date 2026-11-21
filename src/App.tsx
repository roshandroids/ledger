import { MotionConfig } from 'motion/react'
import { Navigate, Route, Routes } from 'react-router'
import { LockScreen } from './lock/LockScreen'
import { useLock } from './lock/useLock'
import { Shell } from './ui/layout/Shell'
import { BudgetPage } from './ui/pages/BudgetPage'
import { GoalsPage } from './ui/pages/GoalsPage'
import { OverviewPage } from './ui/pages/OverviewPage'
import { AccountsPage } from './ui/pages/AccountsPage'
import { TrendsPage } from './ui/pages/TrendsPage'
import { TransactionsPage } from './ui/pages/TransactionsPage'
import { pages } from './ui/pages/pages'

const elements = {
  overview: <OverviewPage />,
  budget: <BudgetPage />,
  transactions: <TransactionsPage />,
  trends: <TrendsPage />,
  accounts: <AccountsPage />,
  goals: <GoalsPage />,
}

/** Old bookmarks look like `/#budget`; send them to `/budget`. */
const legacy = () => {
  const hash = location.hash.replace(/^#\/?/, '')
  return pages.some((p) => p.path === hash) ? `/${hash}` : '/overview'
}

export default function App() {
  const locked = useLock((s) => s.locked)
  if (locked) return <LockScreen />
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/" element={<Navigate to={legacy()} replace />} />
        <Route element={<Shell />}>
          {pages.map((p) => (
            <Route key={p.path} path={p.path} element={elements[p.path]} />
          ))}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </MotionConfig>
  )
}
