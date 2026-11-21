import { useCallback, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'
const KEY = 'ledger-theme'

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

/** Read and persist the chosen appearance. */
export function useTheme() {
  const [theme, setCurrent] = useState<Theme>(read)
  const setTheme = useCallback((next: Theme) => {
    apply(next)
    setCurrent(next)
  }, [])
  return { theme, setTheme }
}
