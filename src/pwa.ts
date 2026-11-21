import { useSyncExternalStore } from 'react'

interface InstallEvent extends Event {
  prompt(): Promise<unknown>
}

let updateReady = false
let installEvent: InstallEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Register the offline service worker (production only) and track update and install state. */
export function registerServiceWorker() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent = e as InstallEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    emit()
  })
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  // A controller change after first load means a newer worker took over.
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      updateReady = true
      emit()
    }
  })
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Offline support is optional; the app works without it.
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePwa() {
  const ready = useSyncExternalStore(subscribe, () => updateReady)
  const canInstall = useSyncExternalStore(
    subscribe,
    () => installEvent !== null,
  )
  return {
    updateReady: ready,
    canInstall,
    install: () => installEvent?.prompt(),
  }
}
