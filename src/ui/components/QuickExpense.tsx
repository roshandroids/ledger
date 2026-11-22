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

const example = 'Log 20 bucks for gas'
const buttonClass =
  'border-line rounded-lg border px-3 py-2 text-sm font-semibold'

function draftFromCommand(
  text: string,
  state: State,
  categories: readonly string[],
): Transaction | null {
  const parsed = parseExpenseCommand(text)
  if (!parsed) return null
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
  return {
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
  }
}

const reviewMessage = 'Review the expense below before saving.'
const retryMessage = `Try “${example}” or “$40 in Walmart groceries”.`

export function QuickExpense({
  state,
  categories,
  accounts,
  initialCommand = '',
  onSave,
  onClose,
}: {
  state: State
  categories: readonly string[]
  accounts: [string, string][]
  initialCommand?: string
  onSave(expense: Transaction): void
  onClose(): void
}) {
  const [command, setCommand] = useState(initialCommand)
  const [draft, setDraft] = useState(() =>
    initialCommand ? draftFromCommand(initialCommand, state, categories) : null,
  )
  const [message, setMessage] = useState(() => {
    if (!initialCommand) return ''
    return draft ? reviewMessage : retryMessage
  })
  const [voice, setVoice] = useState<
    'idle' | 'opening' | 'recording' | 'transcribing'
  >('idle')
  const [online, setOnline] = useState(() => navigator.onLine)
  const session = useRef<AbortController | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const worker = useRef<Worker | null>(null)
  const voiceAvailable = Boolean(navigator.mediaDevices && window.MediaRecorder)
  const listening = voice !== 'idle'

  useEffect(() => {
    function updateConnectivity() {
      setOnline(navigator.onLine)
      if (!navigator.onLine && session.current) {
        session.current.abort()
        session.current = null
        worker.current?.terminate()
        worker.current = null
        setVoice('idle')
        setMessage(
          'Connection lost during voice entry. You can type your command.',
        )
      }
    }

    window.addEventListener('online', updateConnectivity)
    window.addEventListener('offline', updateConnectivity)
    updateConnectivity()
    return () => {
      window.removeEventListener('online', updateConnectivity)
      window.removeEventListener('offline', updateConnectivity)
      session.current?.abort()
      worker.current?.terminate()
    }
  }, [])

  function preview(text: string) {
    const nextDraft = draftFromCommand(text, state, categories)
    setDraft(nextDraft)
    setMessage(nextDraft ? reviewMessage : retryMessage)
  }

  async function listen() {
    if (!navigator.onLine || session.current) return
    const controller = new AbortController()
    const { signal } = controller
    session.current = controller
    setVoice('opening')
    setMessage('Allow microphone access to record an expense.')

    function finish(message: string) {
      if (signal.aborted) return
      controller.abort()
      session.current = null
      setVoice('idle')
      setMessage(message)
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const releaseMicrophone = () =>
        stream.getTracks().forEach((track) => track.stop())
      if (signal.aborted) {
        releaseMicrophone()
        return
      }
      signal.addEventListener('abort', releaseMicrophone, { once: true })
      const recording = new MediaRecorder(stream)
      recorder.current = recording
      const chunks: Blob[] = []
      recording.ondataavailable = ({ data }) => chunks.push(data)
      recording.onerror = () => {
        recorder.current = null
        releaseMicrophone()
        finish(
          'Could not record microphone audio. Try again or type your command.',
        )
      }
      recording.onstop = async () => {
        recorder.current = null
        releaseMicrophone()
        if (signal.aborted || session.current !== controller) return
        setVoice('transcribing')
        setMessage('Transcribing… The first use downloads a speech model.')
        try {
          const audio = new AudioContext({ sampleRate: 16000 })
          let samples: Float32Array
          try {
            const blob = new Blob(chunks, { type: recording.mimeType })
            const decoded = await audio.decodeAudioData(
              await blob.arrayBuffer(),
            )
            samples = decoded.getChannelData(0)
          } finally {
            await audio.close()
          }
          if (signal.aborted) return
          const transcription = (worker.current ??= new Worker(
            new URL('./expenseTranscription.worker.ts', import.meta.url),
            { type: 'module' },
          ))
          transcription.onmessage = ({ data }) => {
            if (signal.aborted) return
            if (data.error) {
              finish(
                'Could not load or run the speech model. Try again or type your command.',
              )
            } else if (!data.transcript) {
              finish('No speech detected. Try again or type your command.')
            } else {
              finish('')
              setCommand(data.transcript)
              preview(data.transcript)
            }
          }
          transcription.onerror = () => {
            transcription.terminate()
            worker.current = null
            finish(
              'Could not start transcription. Try again or type your command.',
            )
          }
          transcription.postMessage(samples, [samples.buffer])
        } catch {
          finish(
            'Could not process the recording. Try again or type your command.',
          )
        }
      }
      recording.start()
      const limit = window.setTimeout(() => {
        if (recording.state === 'recording') recording.stop()
      }, 8000)
      recording.addEventListener('stop', () => window.clearTimeout(limit), {
        once: true,
      })
      signal.addEventListener('abort', () => window.clearTimeout(limit), {
        once: true,
      })
      setVoice('recording')
      setMessage('Speak your expense, then select Stop recording.')
    } catch (error) {
      finish(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Allow microphone access in your browser settings, then try again.'
          : 'Could not start the microphone. Try again or type your command.',
      )
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
          {online && voiceAvailable && (
            <button
              type="button"
              onClick={() => {
                if (voice === 'recording') {
                  if (recorder.current?.state === 'recording')
                    recorder.current.stop()
                } else {
                  void listen()
                }
              }}
              disabled={voice === 'opening' || voice === 'transcribing'}
              className={`${buttonClass} inline-flex items-center gap-2 disabled:opacity-60`}
            >
              <Mic size={16} aria-hidden="true" />{' '}
              {voice === 'recording' ? 'Stop recording' : 'Use microphone'}
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
          {!online
            ? 'Voice entry requires an internet connection. You can type your command.'
            : voiceAvailable
              ? 'Audio is transcribed on this device. First use downloads a speech model.'
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
