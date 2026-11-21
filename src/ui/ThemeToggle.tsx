import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from './useTheme'

const icons = { system: Monitor, light: Sun, dark: Moon }

export function ThemeToggle() {
  const { theme, cycle } = useTheme()
  const Icon = icons[theme]
  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${theme}. Switch theme`}
      className="border-line text-ink grid h-10 w-10 place-content-center rounded-lg border"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
