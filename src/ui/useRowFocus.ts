import { useEffect, useRef, useState } from 'react'

/**
 * Focus rules from the legacy app: after adding a row focus its first input;
 * after removing one focus the Add button.
 */
export function useRowFocus(
  add: () => void,
  remove: (index: number) => boolean,
) {
  const tableRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const [added, setAdded] = useState(0)
  useEffect(() => {
    if (added > 0)
      tableRef.current
        ?.querySelector<HTMLElement>('tbody tr:last-child input')
        ?.focus()
  }, [added])
  return {
    tableRef,
    addRef,
    onAdd() {
      add()
      setAdded((n) => n + 1)
    },
    onRemove(index: number) {
      if (remove(index)) addRef.current?.focus()
    },
  }
}
