import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { EmptyState } from './EmptyState'

interface Props {
  caption: string
  headers: string[]
  rows: { key: string | number; cells: ReactNode[] }[]
  empty: string
  emptyIllustration?: string
}

/** A real table from md up; stacked label/value cards on phones. */
export function DataTable({
  caption,
  headers,
  rows,
  empty,
  emptyIllustration,
}: Props) {
  const reduced = useReducedMotion()
  if (rows.length === 0) {
    return <EmptyState illustration={emptyIllustration}>{empty}</EmptyState>
  }
  return (
    <div className="md:overflow-x-auto">
      <table className="block w-full text-left text-sm md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-md:sr-only">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="text-muted px-2 py-2 text-xs font-bold"
              >
                {h || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {rows.map((r, ri) => (
            <motion.tr
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(ri, 8) * 0.02 }}
              key={r.key}
              className="border-line max-md:bg-surface block border-t max-md:mb-3 max-md:grid max-md:gap-2 max-md:rounded-xl max-md:border max-md:p-3 md:table-row"
            >
              {r.cells.map((c, i) => (
                <td
                  key={i}
                  data-label={headers[i]}
                  className="px-2 py-1 before:text-muted before:text-xs before:font-bold before:content-[attr(data-label)] max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:[&>*]:max-w-[62%] md:table-cell md:py-2 md:before:hidden"
                >
                  {c}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
