import { starter } from '../domain'
import { V2_KEY, createLocalStorage } from './localStorage'

/** Clear Ledger-owned browser data and persist a blank ledger for the next load. */
export async function resetLocalLedger() {
  if (!navigator.onLine)
    throw new Error('Connect to the internet to start fresh.')

  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration?.active?.scriptURL === new URL('/sw.js', location.href).href)
    await registration.unregister()

  if (globalThis.caches) {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith('ledger-'))
        .map((key) => caches.delete(key)),
    )
  }

  if (!createLocalStorage().save(starter(false)))
    throw new Error('Ledger could not write a blank budget in this browser.')

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('ledger-') && key !== V2_KEY)
      localStorage.removeItem(key)
  }
}
