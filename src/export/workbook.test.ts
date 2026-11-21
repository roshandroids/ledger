import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { report, starter } from '../domain'
import type { State } from '../domain'
import { buildWorkbook } from './workbook'

function sample(): State {
  const s = starter()
  s.month = '2026-03'
  s.gym = 'fit'
  s.budget.push(
    {
      name: 'Laptop',
      category: 'Tech',
      type: 'Expense',
      cadence: 'One-time',
      amount: 900,
      due: '2026-03',
    },
    {
      name: 'Insurance',
      category: 'Housing',
      type: 'Expense',
      cadence: 'Annual',
      amount: 600,
      due: '',
    },
  )
  s.goals.push({ id: 'g2', name: 'Trip', target: 1000, opening: 100 })
  s.transactions = [
    {
      date: '2026-03-02',
      type: 'Income',
      category: '',
      amount: 2100,
      goal: '',
      notes: 'pay',
    },
    {
      date: '2026-03-05',
      type: 'Expense',
      category: 'Groceries',
      amount: 80.5,
      goal: '',
      notes: '',
    },
    {
      date: '2026-03-06',
      type: 'Savings transfer',
      category: '',
      amount: 300,
      goal: 'general',
      notes: '',
    },
    {
      date: '2026-02-20',
      type: 'Savings transfer',
      category: '',
      amount: 50,
      goal: 'g2',
      notes: '',
    },
    {
      date: '2026-03-09',
      type: 'Fund expense',
      category: 'Fitness',
      amount: 40,
      goal: 'g2',
      notes: '',
    },
    {
      date: 'bad',
      type: 'Expense',
      category: '',
      amount: 5,
      goal: '',
      notes: '',
    },
  ]
  return s
}

const value = (c: ExcelJS.Cell) =>
  c.value && typeof c.value === 'object' && 'result' in c.value
    ? c.value.result
    : c.value

describe('workbook', () => {
  const state = sample()
  const r = report(state)
  const wb = buildWorkbook(state)

  it('has the five sheets with frozen headers', () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Overview',
      'Settings',
      'Budget',
      'Transactions',
      'Goals',
    ])
    for (const w of wb.worksheets)
      expect(w.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(wb.getWorksheet('Budget')!.getRow(1).values).toEqual([
      undefined,
      'Budget item',
      'Category',
      'Type',
      'Frequency',
      'Amount',
      'Due month',
      'Monthly plan',
      'Payments per year',
    ])
  })

  it('cached values match report()', () => {
    const o = wb.getWorksheet('Overview')!
    expect(value(o.getCell('B3'))).toBeCloseTo(r.planIncome!, 9)
    expect(value(o.getCell('B4'))).toBeCloseTo(r.planSpend, 9)
    expect(value(o.getCell('C4'))).toBeCloseTo(r.actualSpend, 9)
    expect(value(o.getCell('B9'))).toBeCloseTo(r.afterTarget!, 9)
    expect(value(o.getCell('C10'))).toBeCloseTo(r.general, 9)
    const g = wb.getWorksheet('Goals')!
    r.goalRows.forEach((row, i) =>
      expect(value(g.getCell(i + 2, 5))).toBeCloseTo(row.balance, 9),
    )
  })

  it('builds formulas from the reference map', () => {
    const t = wb.getWorksheet('Transactions')!
    expect((t.getCell('H2').value as ExcelJS.CellFormulaValue).formula).toBe(
      'IF(I2=1,D2,"")',
    )
    const b = wb.getWorksheet('Budget')!
    expect(
      (b.getCell('G2').value as ExcelJS.CellFormulaValue).formula,
    ).toContain('Settings!B2')
    expect(
      (
        wb.getWorksheet('Overview')!.getCell('B4')
          .value as ExcelJS.CellFormulaValue
      ).formula,
    ).toContain('Settings!B7')
  })

  it('round-trips through xlsx bytes', async () => {
    const back = new ExcelJS.Workbook()
    await back.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer)
    expect(value(back.getWorksheet('Overview')!.getCell('B4'))).toBeCloseTo(
      r.planSpend,
      9,
    )
    expect(back.getWorksheet('Settings')!.getCell('B3').numFmt).toContain('$')
  })
})

const soffice = spawnSync('soffice', ['--version']).status === 0
describe.skipIf(!soffice)('LibreOffice recalculation (local only)', () => {
  it('recalculated formulas equal the cached values', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'))
    const input = join(dir, 'in.xlsx')
    const outDir = join(dir, 'out')
    const wb = buildWorkbook(sample())
    writeFileSync(
      input,
      new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer),
    )
    execFileSync(
      'soffice',
      ['--headless', '--convert-to', 'xlsx', '--outdir', outDir, input],
      { timeout: 90000 },
    )
    const back = new ExcelJS.Workbook()
    await back.xlsx.readFile(join(outDir, 'in.xlsx'))
    for (const sheet of wb.worksheets) {
      const other = back.getWorksheet(sheet.name)!
      sheet.eachRow((row, r) =>
        row.eachCell((cell, c) => {
          if (!(
            cell.value &&
            typeof cell.value === 'object' &&
            'formula' in cell.value
          ))
            return
          const a = value(cell)
          const b = value(other.getCell(r, c))
          if (typeof a === 'number')
            expect(b, `${sheet.name}!${cell.address}`).toBeCloseTo(a, 6)
          else expect(b ?? '', `${sheet.name}!${cell.address}`).toBe(a)
        }),
      )
    }
  }, 120000)
})
