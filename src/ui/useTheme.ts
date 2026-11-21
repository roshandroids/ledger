import { useCallback, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'
const KEY = 'ledger-theme'
const order: Theme[] = ['system', 'light', 'dark']

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function apply(theme: Theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // storage unavailable: the choice lasts for this session only
  }
}

/** Cycles system → light → dark. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read)
  const cycle = useCallback(() => {
    const next = order[(order.indexOf(theme) + 1) % order.length]
    apply(next)
    setTheme(next)
  }, [theme])
  return { theme, cycle }
}
