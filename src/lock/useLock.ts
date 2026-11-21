import { create } from 'zustand'
import { V1_KEY, V2_KEY, CORRUPT_KEY } from '../storage/localStorage'
import {
  checkPasscode,
  makeRecord,
  MIN_LENGTH,
  parseRecord,
  type LockRecord,
} from './passcode'

export const LOCK_KEY = 'ledger-lock-v1'

const read = (): LockRecord | null => {
  try {
    return parseRecord(localStorage.getItem(LOCK_KEY))
  } catch {
    return null
  }
}

interface LockStore {
  record: LockRecord | null
  /** True from page load until the passcode is entered. */
  locked: boolean
  /** Returns false for a wrong passcode. */
  unlock(pin: string): Promise<boolean>
  lock(): void
  enable(pin: string): Promise<boolean>
  /** Needs the current passcode; returns false when it is wrong. */
  disable(pin: string): Promise<boolean>
  /** Forgotten passcode: erase this device's ledger data and the lock. */
  eraseEverything(): void
}

const initial = read()

export const useLock = create<LockStore>((set, get) => ({
  record: initial,
  locked: initial !== null,
  async unlock(pin) {
    const { record } = get()
    if (!record || !(await checkPasscode(pin, record))) return false
    set({ locked: false })
    return true
  },
  lock() {
    if (get().record) set({ locked: true })
  },
  async enable(pin) {
    if (pin.length < MIN_LENGTH) return false
    const record = await makeRecord(pin)
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify(record))
    } catch {
      return false
    }
    set({ record })
    return true
  },
  async disable(pin) {
    const { record } = get()
    if (!record || !(await checkPasscode(pin, record))) return false
    try {
      localStorage.removeItem(LOCK_KEY)
    } catch {
      return false
    }
    set({ record: null, locked: false })
    return true
  },
  eraseEverything() {
    try {
      for (const k of [LOCK_KEY, V1_KEY, V2_KEY, CORRUPT_KEY])
        localStorage.removeItem(k)
    } catch {
      /* nothing more to do */
    }
    location.reload()
  },
}))
