import type { ReactNode } from 'react'

/** Small inline SVG illustration (coins and bars) with a message. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 py-8 text-center">
      <svg
        width="96"
        height="72"
        viewBox="0 0 96 72"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="14"
          y="40"
          width="14"
          height="24"
          rx="3"
          fill="var(--plan)"
          opacity="0.7"
        />
        <rect
          x="34"
          y="28"
          width="14"
          height="36"
          rx="3"
          fill="var(--actual)"
          opacity="0.7"
        />
        <rect x="54" y="16" width="14" height="48" rx="3" fill="var(--mint)" />
        <circle cx="78" cy="22" r="11" fill="var(--teal)" opacity="0.9" />
        <text
          x="78"
          y="27"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="#fff"
        >
          $
        </text>
        <path
          d="M8 66h80"
          stroke="var(--line)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-muted max-w-xs text-sm">{children}</p>
    </div>
  )
}
