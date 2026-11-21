export interface LockRecord {
  salt: string
  hash: string
  iterations: number
}

export const MIN_LENGTH = 4
const ITERATIONS = 210_000

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const unb64 = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

async function derive(pin: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  )
  return b64(new Uint8Array(bits))
}

/** Salted PBKDF2 hash of a passcode; the passcode itself is never stored. */
export async function makeRecord(pin: string): Promise<LockRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return {
    salt: b64(salt),
    hash: await derive(pin, salt, ITERATIONS),
    iterations: ITERATIONS,
  }
}

export async function checkPasscode(
  pin: string,
  record: LockRecord,
): Promise<boolean> {
  return (
    (await derive(pin, unb64(record.salt), record.iterations)) === record.hash
  )
}

/** Anything that is not a well-formed record counts as no lock. */
export function parseRecord(text: string | null): LockRecord | null {
  try {
    const r = JSON.parse(text ?? 'null')
    return typeof r?.salt === 'string' &&
      typeof r?.hash === 'string' &&
      Number.isInteger(r?.iterations) &&
      r.iterations > 0
      ? r
      : null
  } catch {
    return null
  }
}
