export type LimitLevel = 'ok' | 'near' | 'over'

export const NEAR_RATIO = 0.8

/** A category's budget (plus any carried-over amount) is its limit. No limit means no status. */
export function limitStatus(
  actual: number,
  limit: number,
): { ratio: number; level: LimitLevel } | null {
  if (!(limit > 0)) return null
  const ratio = actual / limit
  return {
    ratio,
    level: ratio > 1 ? 'over' : ratio >= NEAR_RATIO ? 'near' : 'ok',
  }
}
