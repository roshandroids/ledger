import { Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  currencyOf,
  defaultCategories,
  monthKey,
  type State,
  type Transaction,
} from '../../domain'
import { parseExpenseCommand } from '../../domain/expenseCommand'
import { CategoryInput } from './CategoryInput'
import { ConfirmDialog } from './ConfirmDialog'
import { MoneyInput } from './MoneyInput'
import { Select } from './Select'
import { TextInput } from './TextInput'

interface Recognition {
  lang: string
  onresult:
    | ((
        event: Event & {
          results: ArrayLike<ArrayLike<{ transcript: string }>>
        },
      ) => void)
    | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
type RecognitionWindow = Window & {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}

const example = 'Log 20 bucks for gas'
const buttonClass =
  'border-line rounded-lg border px-3 py-2 text-sm font-semibold'

export function QuickExpense({
  state,
  categories,
  accounts,
  onSave,
  onClose,
}: {
  state: State
  categories: readonly string[]
  accounts: [string, string][]
  onSave(expense: Transaction): void
  onClose(): void
}) {
  const [command, setCommand] = useState('')
  const [draft, setDraft] = useState<Transaction | null>(null)
  const [message, setMessage] = useState('')
  const [listening, setListening] = useState(false)
  const active = useRef<Recognition | null>(null)
  const browser = window as RecognitionWindow
  const SpeechRecognition =
    browser.SpeechRecognition ?? browser.webkitSpeechRecognition

  useEffect(
    () => () => {
      const recognition = active.current
      if (!recognition) return
      recognition.onresult = recognition.onerror = recognition.onend = null
      active.current = null
      recognition.abort()
    },
    [],
  )

  function preview(text: string) {
    const parsed = parseExpenseCommand(text)
    if (!parsed) {
      setDraft(null)
      setMessage(`Try a command like “${example}”.`)
      return
    }
    const description = parsed.notes.toLowerCase()
    const isFuel = /^(?:gas|gasoline|petrol|fuel)(?:\b|$)/i.test(description)
    const matchingItem = [...state.budget, ...state.recurring].find(
      (item) =>
        item.type === 'Expense' &&
        item.category &&
        (item.name.trim().toLowerCase() === description ||
          (isFuel && /^(?:gas|gasoline|petrol|fuel)$/i.test(item.name.trim()))),
    )
    const matchingCategory = [...categories, ...defaultCategories].find(
      (category) => category.toLowerCase() === description,
    )
    const now = new Date()
    setDraft({
      date: `${monthKey(now)}-${String(now.getDate()).padStart(2, '0')}`,
      type: 'Expense',
      category:
        matchingItem?.category ||
        matchingCategory ||
        (isFuel ? 'Transportation' : ''),
      amount: parsed.amount,
      notes: parsed.notes,
      goal: '',
      account: '',
    })
    setMessage('Review the expense below before saving.')
  }

  function listen() {
    if (!SpeechRecognition || active.current) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-CA'
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (!transcript) return
      setCommand(transcript)
      preview(transcript)
    }
    recognition.onerror = () =>
      setMessage('Voice recognition failed. Try again or type your command.')
    recognition.onend = () => {
      active.current = null
      setListening(false)
      setMessage((text) =>
        text === 'Listening…'
          ? 'No command heard. Try again or type your command.'
          : text,
      )
    }
    active.current = recognition
    try {
      recognition.start()
      setListening(true)
      setMessage('Listening…')
    } catch {
      active.current = null
      setListening(false)
      setMessage('Could not start the microphone. Type your command instead.')
    }
  }

  const amount = Number(draft?.amount)
  const canSave =
    Boolean(draft && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)) &&
    amount > 0 &&
    Number.isSafeInteger(Math.round(amount * 100)) &&
    !listening

  return (
    <ConfirmDialog
      open
      title="Quick expense"
      confirmLabel="Save expense"
      onClose={onClose}
      confirmDisabled={!canSave}
      onConfirm={() => {
        if (canSave && draft) onSave(draft)
      }}
    >
      <div className="grid max-w-md gap-3">
        <label className="grid gap-1">
          English expense command
          <TextInput
            label="Expense command"
            placeholder={example}
            value={command}
            maxLength={240}
            onChange={(value) => {
              setCommand(value)
              setDraft(null)
              setMessage('')
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {SpeechRecognition && (
            <button
              type="button"
              onClick={listen}
              disabled={listening}
              className={`${buttonClass} inline-flex items-center gap-2 disabled:opacity-60`}
            >
              <Mic size={16} aria-hidden="true" />{' '}
              {listening ? 'Listening…' : 'Use microphone'}
            </button>
          )}
          <button
            type="button"
            onClick={() => preview(command)}
            disabled={!command.trim() || listening}
            className={`${buttonClass} disabled:opacity-60`}
          >
            Preview expense
          </button>
        </div>
        <p className="text-muted text-xs">
          {SpeechRecognition
            ? 'Your browser may use an online service to transcribe your voice.'
            : 'Microphone recognition is unavailable in this browser. You can type your command.'}
        </p>
        {message && <p role="status">{message}</p>}
        {draft && (
          <div className="border-line grid gap-3 border-t pt-3 sm:grid-cols-2">
            <label className="grid gap-1">
              Amount ({currencyOf(state, draft.account)})
              <MoneyInput
                label="Expense amount"
                value={draft.amount}
                onChange={(amount) => setDraft({ ...draft, amount })}
              />
            </label>
            <label className="grid gap-1">
              Date
              <input
                type="date"
                max="9999-12-31"
                className="border-line rounded-lg border px-3 py-2"
                value={draft.date}
                onChange={(event) =>
                  setDraft({ ...draft, date: event.target.value })
                }
              />
            </label>
            <div className="grid gap-1">
              Category
              <CategoryInput
                label="Expense category"
                extra={categories}
                value={draft.category}
                onChange={(category) => setDraft({ ...draft, category })}
              />
            </div>
            {state.accounts.length > 0 && (
              <div className="grid gap-1">
                Account
                <Select
                  label="Expense account"
                  value={draft.account ?? ''}
                  options={accounts}
                  onChange={(account) => setDraft({ ...draft, account })}
                />
              </div>
            )}
            <label className="grid gap-1 sm:col-span-2">
              Notes
              <TextInput
                label="Expense notes"
                value={draft.notes}
                onChange={(notes) => setDraft({ ...draft, notes })}
              />
            </label>
          </div>
        )}
      </div>
    </ConfirmDialog>
  )
}
