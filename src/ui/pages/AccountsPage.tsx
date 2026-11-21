import { useTranslation } from '../i18n'
import { useMemo, useState } from 'react'
import {
  accountBalances,
  accountKinds,
  addMonths,
  isDebt,
  netWorth,
  netWorthSeries,
  payoff,
  payoffPlan,
  currencies,
  rateFor,
} from '../../domain'
import type { Strategy } from '../../domain'
import type { AccountKind } from '../../domain'
import { useLedger } from '../../store/useLedger'
import { AddButton, RemoveButton } from '../components/AddButton'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { DatePicker } from '../components/DatePicker'
import { MoneyInput } from '../components/MoneyInput'
import { Panel } from '../components/Panel'
import { Select } from '../components/Select'
import { TextInput } from '../components/TextInput'
import { TrendChart } from '../components/TrendChart'
import { fmt, fmtIn } from '../format'
import { palette } from '../chartData'
import { useRowFocus } from '../useRowFocus'

const label = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  year: '2-digit',
})
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return label.format(new Date(y, mo - 1, 1))
}

export function AccountsPage() {
  const t = useTranslation()
  const state = useLedger((s) => s.state)
  const { updateRow, addRow, removeRow, setSetting } = useLedger.getState()
  const [blocked, setBlocked] = useState(false)
  const [extra, setExtra] = useState('')
  const {
    tableRef: accountTable,
    addRef: accountAdd,
    onAdd: onAddAccount,
    onRemove: onRemoveAccount,
  } = useRowFocus(
    () => addRow('accounts'),
    (i) => {
      const ok = removeRow('accounts', i)
      if (!ok) setBlocked(true)
      return ok
    },
  )
  const {
    tableRef: transferTable,
    addRef: transferAdd,
    onAdd: onAddTransfer,
    onRemove: onRemoveTransfer,
  } = useRowFocus(
    () => addRow('transfers'),
    (i) => removeRow('transfers', i),
  )
  const balances = useMemo(() => accountBalances(state, state.month), [state])
  const worth = useMemo(() => netWorth(state, state.month), [state])
  const series = useMemo(() => netWorthSeries(state, state.month, 12), [state])
  const choices: [string, string][] = state.accounts.map((a) => [
    a.id,
    a.name || 'Unnamed account',
  ])
  const foreign = [
    ...new Set(
      state.accounts
        .map((a) => a.currency || state.currency)
        .filter((c) => c !== state.currency),
    ),
  ]
  const debts = balances.filter(
    (b) => isDebt(b.account) && b.owed !== null && b.owed > 0,
  )

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Assets', worth.assets],
          ['Debts', worth.liabilities],
          ['Net worth', worth.net],
        ].map(([name, value]) => (
          <div
            key={name}
            className="border-line grid gap-1 rounded-xl border bg-card p-4"
          >
            <span className="text-muted text-sm">{name}</span>
            <strong className="text-2xl">{fmt(Number(value))}</strong>
            <small className="text-muted">
              End of {monthLabel(state.month)}
            </small>
          </div>
        ))}
      </div>
      <Panel
        title="Net worth over time"
        subtitle="Assets minus debts at the end of each month, from account balances."
      >
        {state.accounts.length === 0 ? (
          <p className="text-muted text-sm">
            Add an account below to track net worth.
          </p>
        ) : (
          <>
            <TrendChart
              data={series.map((p) => ({
                name: monthLabel(p.month),
                'Net worth': p.net,
              }))}
              series={[{ key: 'Net worth', color: palette[0] }]}
            />
            <div className="mt-4">
              <DataTable
                caption="Net worth by month"
                headers={['Month', 'Assets', 'Debts', 'Net worth']}
                empty="No months."
                rows={series.map((p) => ({
                  key: p.month,
                  cells: [
                    monthLabel(p.month),
                    fmt(p.assets),
                    fmt(p.liabilities),
                    fmt(p.net),
                  ],
                }))}
              />
            </div>
          </>
        )}
      </Panel>
      <Panel
        title={t('Accounts')}
        subtitle="Income and expenses count toward the account on each transaction (unassigned ones use the first account). Savings goals are earmarks and do not move account balances; use a transfer to move money."
        action={
          <AddButton ref={accountAdd} onClick={onAddAccount}>
            + Add account
          </AddButton>
        }
      >
        <div ref={accountTable}>
          <DataTable
            caption={t('Accounts')}
            headers={[
              'Name',
              'Kind',
              'Currency',
              'Opening balance or amount owed',
              'Interest rate (% a year)',
              'Monthly payment',
              'Balance this month',
              '',
            ]}
            empty="No accounts yet. Add a chequing account, a card or a loan."
            rows={state.accounts.map((a, i) => {
              const b = balances[i]
              return {
                key: a.id,
                cells: [
                  <TextInput
                    label="Account name"
                    maxLength={120}
                    value={a.name}
                    onChange={(name) => updateRow('accounts', i, { name })}
                  />,
                  <Select
                    label="Account kind"
                    value={a.kind}
                    options={accountKinds}
                    onChange={(v) =>
                      updateRow('accounts', i, { kind: v as AccountKind })
                    }
                  />,
                  <Select
                    label="Account currency"
                    value={a.currency || state.currency}
                    options={currencies.map((c): [string, string] => [
                      c.code,
                      c.code,
                    ])}
                    onChange={(currency) =>
                      updateRow('accounts', i, { currency })
                    }
                  />,
                  <MoneyInput
                    label="Opening balance"
                    value={a.opening}
                    onChange={(opening) =>
                      updateRow('accounts', i, { opening })
                    }
                  />,
                  isDebt(a) ? (
                    <MoneyInput
                      label="Interest rate"
                      value={a.rate}
                      onChange={(rate) => updateRow('accounts', i, { rate })}
                    />
                  ) : (
                    '—'
                  ),
                  isDebt(a) ? (
                    <MoneyInput
                      label="Monthly payment"
                      value={a.payment}
                      onChange={(payment) =>
                        updateRow('accounts', i, { payment })
                      }
                    />
                  ) : (
                    '—'
                  ),
                  b.owed !== null
                    ? `${fmtIn(b.currency, b.owed)} owed`
                    : fmtIn(b.currency, b.signed),
                  <RemoveButton
                    label="account"
                    onClick={() => onRemoveAccount(i)}
                  />,
                ],
              }
            })}
          />
        </div>
      </Panel>
      {foreign.length > 0 && (
        <Panel
          title="Exchange rates"
          subtitle={`Enter what one unit of each currency is worth in ${state.currency}. Reports, net worth and budgets use these rates. Amounts on an account's transactions are in that account's currency.`}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {foreign.map((code) => (
              <div key={code} className="grid gap-1">
                <MoneyInput
                  label={`1 ${code} in ${state.currency}`}
                  step="0.0001"
                  value={state.rates?.[code] ?? ''}
                  onChange={(v) =>
                    setSetting('rates', {
                      ...state.rates,
                      [code]: Number(v) > 0 ? Number(v) : 0,
                    } as Record<string, number>)
                  }
                />
                {!(state.rates?.[code] ?? 0) && (
                  <small className="text-negative">
                    No rate set: {code} is counted 1 to 1.
                  </small>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel
        title="Transfers"
        subtitle="Move money between accounts, such as paying a card from chequing. Transfers never count as income or spending."
        action={
          state.accounts.length >= 2 && (
            <AddButton ref={transferAdd} onClick={onAddTransfer}>
              + Add transfer
            </AddButton>
          )
        }
      >
        <div ref={transferTable}>
          <DataTable
            caption="Transfers"
            headers={['Date', 'From', 'To', 'Amount', 'Notes', '']}
            empty={
              state.accounts.length >= 2
                ? 'No transfers yet.'
                : 'Add two accounts to record a transfer.'
            }
            rows={state.transfers.map((x, i) => ({
              key: x.id,
              cells: [
                <DatePicker
                  label="Transfer date"
                  value={x.date}
                  onChange={(date) => updateRow('transfers', i, { date })}
                />,
                <Select
                  label="Transfer from"
                  value={x.from}
                  options={[['', 'Choose account'], ...choices]}
                  onChange={(from) => updateRow('transfers', i, { from })}
                />,
                <Select
                  label="Transfer to"
                  value={x.to}
                  options={[['', 'Choose account'], ...choices]}
                  onChange={(to) => updateRow('transfers', i, { to })}
                />,
                <MoneyInput
                  label="Transfer amount"
                  value={x.amount}
                  onChange={(amount) => updateRow('transfers', i, { amount })}
                />,
                <TextInput
                  label="Transfer notes"
                  maxLength={300}
                  value={x.notes}
                  onChange={(notes) => updateRow('transfers', i, { notes })}
                />,
                <RemoveButton
                  label="transfer"
                  onClick={() => onRemoveTransfer(i)}
                />,
              ],
            }))}
          />
        </div>
      </Panel>
      {debts.length > 0 && (
        <Panel
          title="Debt payoff"
          subtitle="Projection from the balance owed at the end of the selected month, the interest rate and the monthly payment."
        >
          <DataTable
            caption="Debt payoff"
            headers={['Debt', 'Owed', 'Payment', 'Payoff', 'Interest to pay']}
            empty="No debts."
            rows={debts.map(({ account: a, owed }) => {
              const plan = payoff(owed ?? 0, Number(a.rate), Number(a.payment))
              return {
                key: a.id,
                cells: [
                  a.name || 'Unnamed account',
                  fmtIn(a.currency || state.currency, owed ?? 0),
                  a.payment === ''
                    ? '—'
                    : fmtIn(a.currency || state.currency, Number(a.payment)),
                  plan
                    ? `${monthLabel(addMonths(state.month, plan.months))} (${plan.months} months)`
                    : a.payment === ''
                      ? 'Set a monthly payment'
                      : 'Payment does not cover the interest',
                  plan
                    ? fmtIn(a.currency || state.currency, plan.interest)
                    : '—',
                ],
              }
            })}
          />
          <Strategies
            debts={debts.map(({ account: a, owed }) => {
              const k = rateFor(state, a.currency)
              return {
                id: a.id,
                name: a.name || 'Unnamed account',
                owed: (owed ?? 0) * k,
                rate: Number(a.rate) || 0,
                payment: (Number(a.payment) || 0) * k,
              }
            })}
            month={state.month}
            extra={extra}
            onExtra={setExtra}
          />
        </Panel>
      )}
      {blocked && (
        <ConfirmDialog
          open
          title="Account in use"
          onClose={() => setBlocked(false)}
        >
          This account has transactions or transfers. Reassign or remove them
          first.
        </ConfirmDialog>
      )}
    </>
  )
}

const strategyRows: [string, Strategy][] = [
  ['Snowball (smallest balance first)', 'snowball'],
  ['Avalanche (highest rate first)', 'avalanche'],
]

function Strategies({
  debts,
  month,
  extra,
  onExtra,
}: {
  debts: {
    id: string
    name: string
    owed: number
    rate: number
    payment: number
  }[]
  month: string
  extra: string
  onExtra(v: string): void
}) {
  if (!debts.some((d) => d.owed > 0)) return null
  const more = Number(extra) || 0
  const alone = debts.map((d) => payoff(d.owed, d.rate, d.payment))
  const separate = alone.every(Boolean)
    ? {
        months: Math.max(...alone.map((p) => p!.months)),
        interest: alone.reduce((t, p) => t + p!.interest, 0),
      }
    : null
  const name = new Map(debts.map((d) => [d.id, d.name]))
  const when = (months: number) =>
    `${monthLabel(addMonths(month, months))} (${months} months)`
  return (
    <div className="mt-6">
      <div className="mb-3 max-w-xs">
        <MoneyInput
          label="Extra monthly payment"
          placeholder="Extra per month"
          value={extra}
          onChange={onExtra}
        />
      </div>
      <DataTable
        caption="Payoff strategies"
        headers={['Strategy', 'Debt free', 'Interest to pay', 'Payoff order']}
        empty="No debts."
        rows={[
          {
            key: 'separate',
            cells: [
              'Planned payments only',
              separate
                ? when(separate.months)
                : 'A payment does not cover its interest',
              separate ? fmt(separate.interest) : '—',
              '—',
            ],
          },
          ...strategyRows.map(([label, strategy]) => {
            const plan = payoffPlan(debts, more, strategy)
            return {
              key: strategy,
              cells: [
                label,
                plan
                  ? when(plan.months)
                  : 'Set payments or an extra amount that cover the interest',
                plan ? fmt(plan.interest) : '—',
                plan ? plan.order.map((id) => name.get(id)).join(' → ') : '—',
              ],
            }
          }),
        ]}
      />
    </div>
  )
}
