import { Navigate, Route, Routes } from 'react-router'
import { Shell } from './ui/layout/Shell'
import { pages } from './ui/pages/pages'

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
          <Route
            key={p.path}
            path={p.path}
            element={<p>{p.title} coming in Phase 5.</p>}
          />
        ))}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  )
}
