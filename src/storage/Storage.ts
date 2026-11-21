import type { State } from '../domain'

export interface LoadResult {
  state: State
  /** False when storage is unreadable; callers should warn about data loss. */
  canSave: boolean
}

export interface Storage {
  load(): LoadResult
  /** Returns false when the write failed. */
  save(state: State): boolean
}
