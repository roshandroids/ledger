import type { ReactNode } from 'react'

interface Props {
  caption: string
  headers: string[]
  rows: { key: string | number; cells: ReactNode[] }[]
  empty: string
}

export function DataTable({ caption, headers, rows, empty }: Props) {
  if (rows.length === 0)
    return <p className="text-muted py-6 text-center text-sm">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
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
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-line border-t">
              {r.cells.map((c, i) => (
                <td key={i} className="px-2 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
