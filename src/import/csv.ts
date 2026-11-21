/** Parse CSV text: quoted fields, escaped quotes, CRLF, BOM, and `,` `;` or tab delimiters. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '')
  const first = t.split(/\r?\n/, 1)[0]
  const delim = [',', ';', '\t']
    .map((d) => [d, first.split(d).length] as const)
    .sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === delim) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** Text cells starting with = + - @ are prefixed so spreadsheets never run them as formulas. */
const safe = (s: string) => (/^[=+\-@\t\r]/.test(s) ? "'" + s : s)
const cell = (s: string) =>
  /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s

export function toCsv(
  header: string[],
  rows: (string | number)[][],
  textColumns: number[] = [],
): string {
  const line = (r: (string | number)[]) =>
    r
      .map((v, i) =>
        cell(textColumns.includes(i) ? safe(String(v)) : String(v)),
      )
      .join(',')
  return [header, ...rows].map(line).join('\r\n') + '\r\n'
}
