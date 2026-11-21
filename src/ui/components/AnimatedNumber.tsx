import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number | null
  format(value: number | null): string
}

/** Counts up to `value`; renders it instantly under prefers-reduced-motion. */
export function AnimatedNumber({ value, format }: Props) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(value)
  const from = useRef(value ?? 0)
  useEffect(() => {
    if (reduced || value === null) {
      from.current = value ?? 0
      return
    }
    const controls = animate(from.current, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        from.current = v
        setShown(v)
      },
      onComplete: () => setShown(value),
    })
    return () => controls.stop()
  }, [value, reduced])
  return <>{format(reduced || value === null ? value : shown)}</>
}
