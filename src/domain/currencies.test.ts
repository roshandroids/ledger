import { afterEach, expect, it } from 'vitest'
import { fmt, setCurrency } from '../ui/format'
import { cashFormat } from './currencies'
import { parseState } from './schema'
import { starter } from './starter'

afterEach(() => setCurrency('CAD'))

it('formats amounts in the chosen currency and falls back to CAD for bad codes', () => {
  expect(fmt(1234.5)).toBe('$1,234.50')
  setCurrency('EUR')
  expect(fmt(1234.5)).toBe('€1,234.50')
  setCurrency('JPY')
  expect(fmt(1234)).toBe('JP¥1,234')
  setCurrency('nope')
  expect(fmt(1)).toBe('$1.00')
})

it('builds Excel formats with the symbol and decimals of each currency', () => {
  expect(cashFormat('CAD')).toBe('"$"#,##0.00;("$"#,##0.00)')
  expect(cashFormat('USD')).toBe('"US$"#,##0.00;("US$"#,##0.00)')
  expect(cashFormat('JPY')).toBe('"JP¥"#,##0;("JP¥"#,##0)')
  expect(cashFormat('xxx')).toBe(cashFormat('CAD'))
})

it('keeps a valid stored currency and resets an unknown one to CAD', () => {
  expect(parseState({ ...starter(), currency: 'GBP' })?.currency).toBe('GBP')
  expect(parseState({ ...starter(), currency: 'ZZZ' })?.currency).toBe('CAD')
  const { currency: _omit, ...old } = starter()
  expect(parseState(old)?.currency).toBe('CAD')
})
