import { create } from 'zustand'

export const paletteLabels = {
  violet: ['Violet', '#8153e6'],
  ocean: ['Ocean', '#087fa8'],
  sunset: ['Sunset', '#c64063'],
  forest: ['Forest', '#269363'],
  amber: ['Amber', '#b87016'],
  rose: ['Rose', '#ba347e'],
  cobalt: ['Cobalt', '#326ddc'],
  graphite: ['Graphite', '#697993'],
} as const
export const fontLabels = {
  inter: 'Inter',
  system: 'System font',
  serif: 'Serif',
  mono: 'Monospace',
  humanist: 'Humanist',
  rounded: 'Rounded',
  editorial: 'Editorial',
} as const
export const languageOptions = {
  en: { name: 'English', locale: 'en-CA' },
  fr: { name: 'Français', locale: 'fr-CA' },
  es: { name: 'Español', locale: 'es' },
  ne: { name: 'नेपाली', locale: 'ne-NP' },
  ja: { name: '日本語', locale: 'ja-JP' },
  ar: { name: 'العربية', locale: 'ar-u-ca-gregory' },
} as const
export type Language = keyof typeof languageOptions

function keys<T extends object>(options: T) {
  return Object.keys(options) as (keyof T)[]
}

export const palettes = keys(paletteLabels)
export const fonts = keys(fontLabels)
export const languages = keys(languageOptions)
const choices = { palette: palettes, font: fonts, language: languages }
type Preferences = { [K in keyof typeof choices]: (typeof choices)[K][number] }

function read<K extends keyof Preferences>(key: K): Preferences[K] {
  const options: readonly string[] = choices[key]
  try {
    const saved = localStorage.getItem(`ledger-${key}`)
    if (saved && options.includes(saved)) return saved as Preferences[K]
  } catch {
    // Preferences remain available for the current session.
  }
  return choices[key][0] as Preferences[K]
}

function apply<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  if (key === 'language') {
    document.documentElement.lang = value
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'
  } else document.documentElement.dataset[key] = value
}

export const usePreferences = create<
  Preferences & {
    setPreference<K extends keyof Preferences>(
      key: K,
      value: Preferences[K],
    ): void
  }
>((set) => ({
  palette: read('palette'),
  font: read('font'),
  language: read('language'),
  setPreference(key, value) {
    apply(key, value)
    try {
      localStorage.setItem(`ledger-${key}`, value)
    } catch {
      // Preferences remain available for the current session.
    }
    set({ [key]: value })
  },
}))

export function applyPreferences() {
  const { palette, font, language } = usePreferences.getState()
  apply('palette', palette)
  apply('font', font)
  apply('language', language)
}

export function displayLocale() {
  return languageOptions[usePreferences.getState().language].locale
}
