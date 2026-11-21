export const currencies = [
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'NZD', name: 'New Zealand dollar' },
  { code: 'CHF', name: 'Swiss franc' },
  { code: 'JPY', name: 'Japanese yen' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'MXN', name: 'Mexican peso' },
] as const

/** Excel number format showing the currency symbol as shown in en-CA ("$", "US$", "€"). */
export function cashFormat(code: string): string {
  const parts = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currencies.some((c) => c.code === code) ? code : 'CAD',
  }).formatToParts(1)
  const symbol = parts.find((p) => p.type === 'currency')?.value ?? '$'
  const digits = parts.some((p) => p.type === 'fraction') ? '.00' : ''
  const body = `"${symbol.replace(/"/g, '')}"#,##0${digits}`
  return `${body};(${body})`
}
