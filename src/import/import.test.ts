import { describe, expect, it } from 'vitest'
import type { Transaction } from '../domain'
import { parseCsv, toCsv } from './csv'
import {
  guessMapping,
  mapRows,
  markDuplicates,
  parseAmount,
  parseDate,
  rulesToText,
  textToRules,
} from './mapping'

const rules = [{ keyword: 'tim hortons', category: 'Coffee' }]
const run = (text: string, tweak = {}) => {
  const rows = parseCsv(text)
  return mapRows(rows, { ...guessMapping(rows), ...tweak }, rules)
}

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, BOM, CRLF and embedded newlines', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n"l1\nl2",z\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['l1\nl2', 'z'],
    ])
  })
  it('detects semicolons and tabs and drops blank rows', () => {
    expect(parseCsv('a;b\n1;2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(parseCsv('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
  it('round-trips toCsv and neutralizes formula cells in text columns', () => {
    const out = toCsv(
      ['d', 'n'],
      [
        ['2026-01-01', '=HYPERLINK("x")'],
        ['b', 'a,"b"'],
      ],
      [1],
    )
    expect(out).toContain(`"'=HYPERLINK(""x"")"`)
    expect(parseCsv(out)[2]).toEqual(['b', 'a,"b"'])
  })
})

describe('parsing values', () => {
  it('reads dates in each format and rejects impossible ones', () => {
    expect(parseDate('03/05/2026', 'mdy')).toBe('2026-03-05')
    expect(parseDate('03/05/2026', 'dmy')).toBe('2026-05-03')
    expect(parseDate('2026-3-5 10:22', 'dmy')).toBe('2026-03-05')
    expect(parseDate('5.3.26', 'dmy')).toBe('2026-03-05')
    expect(parseDate('31/02/2026', 'dmy')).toBe('')
    expect(parseDate('garbage', 'ymd')).toBe('')
  })
  it('reads bank-style amounts', () => {
    expect(parseAmount('$1,234.50')).toBe(1234.5)
    expect(parseAmount('(12.00)')).toBe(-12)
    expect(parseAmount('-5')).toBe(-5)
    expect(parseAmount('12,50')).toBe(12.5)
    expect(parseAmount('1.234,56')).toBe(1234.56)
    expect(parseAmount('')).toBeNaN()
  })
})

describe('three bank layouts', () => {
  it('headerless, debit/credit columns, US dates', () => {
    const r = run(
      '03/05/2026,TIM HORTONS #42,4.50,,500.00\n03/06/2026,PAYROLL,,2000.00,2495.50\n',
      {
        hasHeader: false,
        date: 0,
        description: 1,
        amount: -1,
        debit: 2,
        credit: 3,
        dateFormat: 'mdy',
      },
    )
    expect(r.map((c) => c.error)).toEqual([undefined, undefined])
    expect(r[0].tx).toMatchObject({
      date: '2026-03-05',
      type: 'Expense',
      amount: 4.5,
      category: 'Coffee',
    })
    expect(r[1].tx).toMatchObject({ type: 'Income', amount: 2000 })
  })
  it('header, one signed column, ISO dates, quoted commas', () => {
    const r = run(
      'Date,Description,Amount\n2026-03-05,"Rent, March",-1200.00\n2026-03-07,Refund,35.10\n',
    )
    expect(r[0].tx).toMatchObject({
      type: 'Expense',
      amount: 1200,
      notes: 'Rent, March',
    })
    expect(r[1].tx).toMatchObject({ type: 'Income', amount: 35.1 })
  })
  it('semicolons, day-first dates, parentheses and decimal commas', () => {
    const r = run(
      'Datum;Memo;Amount\n05/03/2026;Gas;(40,25)\n06/03/2026;Pay;100,00\n',
      {
        hasHeader: true,
        dateFormat: 'dmy',
        expenseSign: 'negative',
      },
    )
    expect(r.map((c) => c.error)).toEqual([undefined, undefined])
    expect(r[0].tx).toMatchObject({
      date: '2026-03-05',
      type: 'Expense',
      amount: 40.25,
    })
    expect(r[1].tx).toMatchObject({
      date: '2026-03-06',
      type: 'Income',
      amount: 100,
    })
  })
  it('reports row errors instead of importing them', () => {
    const r = run(
      'Date,Description,Amount\nbad,X,5\n2026-03-05,Y,abc\n2026-03-05,Z,0\n',
    )
    expect(r.map((c) => c.error)).toEqual([
      'Invalid date',
      'Invalid amount',
      'No amount',
    ])
  })
})

describe('duplicates and rules', () => {
  const base: Transaction = {
    date: '2026-03-05',
    type: 'Expense',
    category: '',
    amount: 4.5,
    goal: '',
    notes: 'Coffee',
  }
  it('marks rows already present, counted so repeats are not all dropped', () => {
    const cand = [base, base, base].map((tx) => ({ tx }))
    const out = markDuplicates(cand, [
      { ...base, notes: ' coffee ', amount: '4.50' },
    ])
    expect(out.map((c) => !!c.duplicate)).toEqual([true, false, false])
  })
  it('round-trips category rules as text and ignores bad lines', () => {
    const text = 'uber = Transport\nnonsense\n= Empty\nshell = Fuel'
    expect(textToRules(text)).toEqual([
      { keyword: 'uber', category: 'Transport' },
      { keyword: 'shell', category: 'Fuel' },
    ])
    expect(rulesToText(textToRules(text))).toBe(
      'uber = Transport\nshell = Fuel',
    )
  })
})
