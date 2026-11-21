/** Google Drive saving: Identity Services token flow + Drive v3 upload. No backend; scope is `drive.file`. */

const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FILES_KEY = 'ledger-drive-files'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}
interface TokenClient {
  requestAccessToken(): void
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string
        scope: string
        callback(r: TokenResponse): void
        error_callback?(e: { type: string }): void
      }): TokenClient
    }
  }
}
declare global {
  interface Window {
    google?: Gis
  }
}

export const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

let gisLoading: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (window.google) return Promise.resolve()
  gisLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisLoading = null
      reject(new Error('Could not load Google sign-in.'))
    }
    document.head.append(s)
  })
  return gisLoading
}

let cached: { token: string; expires: number } | null = null

/** Opens Google's consent popup (once per hour); the token stays in memory only. */
export async function getAccessToken(id: string): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token
  await loadGis()
  return new Promise((resolve, reject) => {
    window
      .google!.accounts.oauth2.initTokenClient({
        client_id: id,
        scope: SCOPE,
        callback: (r) => {
          if (r.access_token) {
            cached = {
              token: r.access_token,
              expires: Date.now() + (r.expires_in ?? 3600) * 1000,
            }
            resolve(r.access_token)
          } else reject(new Error(r.error ?? 'Google sign-in failed.'))
        },
        error_callback: (e) => reject(new Error(`Google sign-in ${e.type}.`)),
      })
      .requestAccessToken()
  })
}

export type DriveKind = 'excel' | 'backup'
export interface DriveFile {
  id: string
  webViewLink?: string
}

const readIds = (): Partial<Record<DriveKind, string>> => {
  try {
    return JSON.parse(localStorage.getItem(FILES_KEY) ?? '{}')
  } catch {
    return {}
  }
}
const rememberId = (kind: DriveKind, id: string) => {
  try {
    localStorage.setItem(
      FILES_KEY,
      JSON.stringify({ ...readIds(), [kind]: id }),
    )
  } catch {
    // storage unavailable: next save creates a new file
  }
}

async function send(
  token: string,
  fileId: string | undefined,
  name: string,
  mime: string,
  blob: Blob,
  fetchFn: typeof fetch,
) {
  const boundary = 'ledger' + crypto.randomUUID()
  const meta = JSON.stringify(fileId ? { name } : { name, mimeType: mime })
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ])
  const base = 'https://www.googleapis.com/upload/drive/v3/files'
  const url = `${fileId ? `${base}/${fileId}` : base}?uploadType=multipart&fields=id,webViewLink`
  return fetchFn(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
}

/**
 * Create the file the first time, then update the same one. If the remembered
 * file is gone or no longer accessible (404), create a fresh one.
 */
export async function saveToDrive(
  token: string,
  kind: DriveKind,
  name: string,
  mime: string,
  blob: Blob,
  fetchFn: typeof fetch = fetch,
): Promise<DriveFile> {
  let res = await send(token, readIds()[kind], name, mime, blob, fetchFn)
  if (res.status === 404 && readIds()[kind])
    res = await send(token, undefined, name, mime, blob, fetchFn)
  if (!res.ok)
    throw new Error(`Google Drive rejected the save (${res.status}).`)
  const file = (await res.json()) as DriveFile
  rememberId(kind, file.id)
  return file
}

/** Text of the newest Ledger backup this app created in Drive, or null if there is none. */
export async function loadLatestBackup(
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const auth = { headers: { Authorization: `Bearer ${token}` } }
  const q = encodeURIComponent(
    "name contains 'ledger-backup' and mimeType='application/json' and trashed=false",
  )
  const list = await fetchFn(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime%20desc&pageSize=1&fields=files(id)`,
    auth,
  )
  if (!list.ok)
    throw new Error(`Google Drive could not list backups (${list.status}).`)
  const id = ((await list.json()) as { files?: { id: string }[] }).files?.[0]
    ?.id
  if (!id) return null
  const file = await fetchFn(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
    auth,
  )
  if (!file.ok)
    throw new Error(`Google Drive could not read the backup (${file.status}).`)
  return file.text()
}
