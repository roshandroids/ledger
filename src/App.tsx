import { Navigate, Route, Routes } from 'react-router'
import { Shell } from './ui/layout/Shell'
import { BudgetPage } from './ui/pages/BudgetPage'
import { GoalsPage } from './ui/pages/GoalsPage'
import { OverviewPage } from './ui/pages/OverviewPage'
import { TransactionsPage } from './ui/pages/TransactionsPage'
import { pages } from './ui/pages/pages'

const elements = {
  overview: <OverviewPage />,
  budget: <BudgetPage />,
  transactions: <TransactionsPage />,
  goals: <GoalsPage />,
}

/** Old bookmarks look like `/#budget`; send them to `/budget`. */
const legacy = () => {
  const hash = location.hash.replace(/^#\/?/, '')
  return pages.some((p) => p.path === hash) ? `/${hash}` : '/overview'
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to={legacy()} replace />} />
        {pages.map((p) => (
          <Route key={p.path} path={p.path} element={elements[p.path]} />
        ))}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  )
}
