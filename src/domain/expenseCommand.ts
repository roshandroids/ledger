const units =
  'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(
    ' ',
  )
const tens = 'twenty thirty forty fifty sixty seventy eighty ninety'.split(' ')

function underHundred(words: string): number | undefined {
  const unit = units.indexOf(words)
  if (unit >= 0) return unit
  const [first, second, ...extra] = words.split(' ')
  const ten = tens.indexOf(first)
  if (ten < 0 || extra.length) return
  const ones = second === undefined ? 0 : units.indexOf(second)
  if (ones >= 0 && ones < 10) return (ten + 2) * 10 + ones
}

/** Parse a simple English expense command. Leave the ledger untouched. */
export function parseExpenseCommand(command: string) {
  const match =
    /^(?:(?:log|add|(?:i )?(?:spent|paid)) )?\$?(.+?) (?:for|on|at|in) (.+)$/i.exec(
      command.trim().replace(/\s+/g, ' '),
    )
  if (!match) return null
  const input = match[1].toLowerCase().replace(/ (?:bucks?|dollars?)$/, '')
  const words = input.replaceAll('-', ' ')
  const hundred =
    /^(one|two|three|four|five|six|seven|eight|nine) hundred(?: (?:and )?(.+))?$/.exec(
      words,
    )
  const amount = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$|^\d+(?:\.\d{1,2})?$/.test(
    input,
  )
    ? Number(input.replaceAll(',', ''))
    : hundred
      ? units.indexOf(hundred[1]) * 100 +
        (hundred[2] ? (underHundred(hundred[2]) ?? NaN) : 0)
      : underHundred(words)
  if (!amount || !Number.isSafeInteger(Math.round(amount * 100))) return null
  const notes = match[2].replace(/[.!?]+$/, '').trim()
  return notes ? { amount, notes } : null
}
