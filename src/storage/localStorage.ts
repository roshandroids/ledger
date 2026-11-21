import { parseState, SCHEMA_VERSION, starter, type State } from '../domain'
import type { LoadResult, Storage } from './Storage'

export const V1_KEY = 'ledger-budget-v1'
export const V2_KEY = 'ledger-budget-v2'
export const CORRUPT_KEY = 'ledger-budget-corrupt'

function parseJson(text: string | null): unknown {
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function createLocalStorage(
  backend: globalThis.Storage = globalThis.localStorage,
): Storage {
  function save(state: State): boolean {
    try {
      backend.setItem(
        V2_KEY,
        JSON.stringify({ version: SCHEMA_VERSION, state }),
      )
      return true
    } catch {
      return false
    }
  }

  function load(): LoadResult {
    try {
      const v2 = backend.getItem(V2_KEY)
      if (v2 !== null) {
        const json = parseJson(v2) as { state?: unknown } | null | undefined
        const state = json ? parseState(json.state) : null
        if (state) return { state, canSave: true }
        backend.setItem(CORRUPT_KEY, v2)
        return { state: starter(), canSave: true }
      }
      // Migrate v1: write v2 and read it back before trusting it; v1 is never deleted.
      const v1 = backend.getItem(V1_KEY)
      if (v1 !== null) {
        const state = parseState(parseJson(v1))
        if (state && save(state) && backend.getItem(V2_KEY) !== null) {
          return { state, canSave: true }
        }
        if (!state) backend.setItem(CORRUPT_KEY, v1)
      }
      return { state: starter(), canSave: true }
    } catch {
      return { state: starter(), canSave: false }
    }
  }

  return { load, save }
}
