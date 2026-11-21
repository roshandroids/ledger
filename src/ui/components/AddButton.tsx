import { motion } from 'motion/react'
import { forwardRef } from 'react'

export const AddButton = forwardRef<
  HTMLButtonElement,
  { onClick(): void; children: string }
>(function AddButton({ onClick, children }, ref) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      ref={ref}
      onClick={onClick}
      className="border-line rounded-lg border px-3 py-2 text-sm font-semibold"
    >
      {children}
    </motion.button>
  )
})

export function RemoveButton({
  label,
  onClick,
}: {
  label: string
  onClick(): void
}) {
  return (
    <button
      type="button"
      aria-label={`Remove ${label}`}
      onClick={onClick}
      className="text-negative rounded px-2 py-1 text-lg"
    >
      ×
    </button>
  )
}
