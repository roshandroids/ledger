import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { registerServiceWorker } from './pwa'
import { useLedger } from './store/useLedger'
import { applyPreferences } from './ui/preferences'
import { setCurrency } from './ui/format'

// Formatting reads this before React renders, since the store updates synchronously.
setCurrency(useLedger.getState().state.currency)
useLedger.subscribe((s) => setCurrency(s.state.currency))
applyPreferences()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
