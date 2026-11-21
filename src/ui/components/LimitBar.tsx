import { AlertTriangle, CheckCircle2, XOctagon } from 'lucide-react'
import type { LimitLevel } from '../../domain'
import { pct } from '../format'

const text: Record<LimitLevel, string> = {
  ok: 'On track',
  near: 'Near limit',
  over: 'Over limit',
}
const Icon = { ok: CheckCircle2, near: AlertTriangle, over: XOctagon }

/** Progress plus a text and icon status, so state never relies on colour alone. */
export function LimitBar({
  ratio,
  level,
  name,
}: {
  ratio: number
  level: LimitLevel
  name: string
}) {
  const I = Icon[level]
  return (
    <div className="grid min-w-36 gap-1">
      <progress
        max={100}
        value={Math.min(ratio * 100, 100)}
        aria-label={`${name} limit used`}
        className={level === 'over' ? 'accent-[var(--negative)]' : ''}
      />
      <span
        className={`flex items-center gap-1 text-xs ${level === 'over' ? 'text-negative font-semibold' : 'text-muted'}`}
      >
        <I size={12} aria-hidden="true" />
        {pct(ratio)} · {text[level]}
      </span>
    </div>
  )
}
