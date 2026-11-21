import { parseState, SCHEMA_VERSION, type State } from '../domain'

export const backupFileName = (date = new Date()) =>
  `ledger-backup-${date.toISOString().slice(0, 10)}.json`

export const serializeBackup = (state: State) =>
  JSON.stringify({ app: 'ledger', version: SCHEMA_VERSION, state }, null, 2)

/** Accepts a backup file or a bare v1 state. Returns null when the text is not a usable budget. */
export function parseBackup(text: string): State | null {
  try {
    const json = JSON.parse(text) as unknown
    const inner =
      json && typeof json === 'object' && 'state' in json
        ? (json as { state: unknown }).state
        : json
    return parseState(inner)
  } catch {
    return null
  }
}
