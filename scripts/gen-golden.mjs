// Runs the legacy Ledger.report() over generated states and saves input/output pairs
// as fixtures, so the TS port can be checked against the original behavior.
import { readFileSync, writeFileSync } from 'node:fs'

const Ledger = new Function(
  readFileSync('legacy/model.js', 'utf8') + '; return Ledger',
)()

let seed = 42
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32
const pick = (list) => list[Math.floor(rnd() * list.length)]
const amount = () =>
  rnd() < 0.1 ? '' : String(Math.round(rnd() * 200000) / 100)
const months = ['2026-01', '2026-02', '2026-03', '2026-06', '2026-12']
const cats = ['Housing', 'housing', ' Food ', '', 'Fitness', 'Fun']
const cadences = Object.keys(Ledger.frequencies)
const txTypes = Ledger.transactionTypes

function makeState(i) {
  const month = pick(months)
  const state = Ledger.starter(i % 3 !== 0)
  state.month = month
  state.cadence = pick(cadences.filter((c) => c !== 'One-time'))
  state.gym = pick(Ledger.gymOptions).id
  if (i % 4 === 0) state.pay = amount()
  if (i % 5 === 0) state.target = amount()
  const goalIds = ['general', 'g2', 'g3']
  state.goals = [
    {
      id: 'general',
      name: 'General savings',
      target: amount(),
      opening: amount(),
    },
    { id: 'g2', name: 'Trip', target: amount(), opening: amount() },
    { id: 'g3', name: '', target: '', opening: '' },
  ]
  for (let n = 0; n < Math.floor(rnd() * 6); n++) {
    state.budget.push({
      name: rnd() < 0.2 ? '' : 'Item ' + n,
      category: pick(cats),
      type: pick(['Expense', 'Savings transfer']),
      cadence: pick(cadences),
      amount: amount(),
      due: pick([...months, '']),
    })
  }
  for (let n = 0; n < Math.floor(rnd() * 14); n++) {
    const type = pick(txTypes)
    const inMonth = rnd() < 0.7
    const day = String(1 + Math.floor(rnd() * 28)).padStart(2, '0')
    state.transactions.push({
      date:
        rnd() < 0.08
          ? pick(['', '2026-1-5', 'bad'])
          : (inMonth ? month : pick(months)) + '-' + day,
      type,
      category: pick(cats),
      amount: rnd() < 0.08 ? pick(['abc', '']) : amount(),
      goal: ['Savings transfer', 'Savings withdrawal', 'Fund expense'].includes(
        type,
      )
        ? pick(goalIds)
        : '',
      notes: '',
    })
  }
  return state
}

const cases = Array.from({ length: 40 }, (_, i) => {
  const state = makeState(i)
  return { state, report: JSON.parse(JSON.stringify(Ledger.report(state))) }
})
writeFileSync(
  'src/domain/__fixtures__/golden.json',
  JSON.stringify(cases, null, 1) + '\n',
)
console.log('wrote', cases.length, 'cases')
