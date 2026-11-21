/** Shared classes: floating panels that scale/fade via Headless UI's `transition` data attributes. */
export const panelClass =
  'border-line bg-card text-ink z-30 rounded-xl border shadow-xl shadow-black/10 [--anchor-gap:6px] origin-top transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'
export const triggerClass =
  'border-line bg-card flex w-full min-w-24 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-start hover:border-actual transition-colors'
