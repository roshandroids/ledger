/** Google Drive saving: Identity Services token flow + Drive v3 upload. No backend; scope is `drive.file`. */

const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
const FILES_KEY = 'ledger-drive-files-v2' // v2: files live in the Ledger folder
const FOLDER_NAME = 'Ledger'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

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

const cached = new Map<string, { token: string; expires: number }>()

/** Opens Google's consent popup (once per hour); the token stays in memory only. */
export async function getAccessToken(
  id: string,
  scope = SCOPE,
): Promise<string> {
  const hit = cached.get(scope)
  if (hit && hit.expires > Date.now() + 60_000) return hit.token
  await loadGis()
  return new Promise((resolve, reject) => {
    window
      .google!.accounts.oauth2.initTokenClient({
        client_id: id,
        scope,
        callback: (r) => {
          if (r.access_token) {
            cached.set(scope, {
              token: r.access_token,
              expires: Date.now() + (r.expires_in ?? 3600) * 1000,
            })
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

/** The app's own Drive folder: reuse the one Ledger made earlier, else create it. */
async function ensureFolder(
  token: string,
  fetchFn: typeof fetch,
): Promise<string> {
  const auth = { Authorization: `Bearer ${token}` }
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`,
  )
  const list = await fetchFn(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=1&fields=files(id)`,
    { headers: auth },
  )
  if (!list.ok)
    throw new Error(
      `Google Drive could not look up the folder (${list.status}).`,
    )
  const found = ((await list.json()) as { files?: { id: string }[] }).files?.[0]
  if (found) return found.id
  const made = await fetchFn(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
    },
  )
  if (!made.ok)
    throw new Error(
      `Google Drive could not create the folder (${made.status}).`,
    )
  return ((await made.json()) as { id: string }).id
}

async function send(
  token: string,
  fileId: string | undefined,
  folderId: string | undefined,
  name: string,
  mime: string,
  blob: Blob,
  fetchFn: typeof fetch,
) {
  const boundary = 'ledger' + crypto.randomUUID()
  const meta = JSON.stringify(
    fileId ? { name } : { name, mimeType: mime, parents: [folderId] },
  )
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
 * Create the file in the Ledger folder the first time, then update the same
 * one. If the remembered file is gone or no longer accessible (404), create a
 * fresh one.
 */
export async function saveToDrive(
  token: string,
  kind: DriveKind,
  name: string,
  mime: string,
  blob: Blob,
  fetchFn: typeof fetch = fetch,
): Promise<DriveFile> {
  const known = readIds()[kind]
  let res =
    known && (await send(token, known, undefined, name, mime, blob, fetchFn))
  if (!res || res.status === 404) {
    const folder = await ensureFolder(token, fetchFn)
    res = await send(token, undefined, folder, name, mime, blob, fetchFn)
  }
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

export const getGmailToken = (id: string) => getAccessToken(id, GMAIL_SCOPE)

/** Base64 with a 76-column wrap, as MIME requires for attachments. */
async function mimeBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/.{76}/g, '$&\r\n')
}

const utf8b64 = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))

export interface Attachment {
  name: string
  mime: string
  blob: Blob
}

/** Emails a text+HTML body with attachments through the user's own Gmail (gmail.send); nothing leaves via a third party. */
export async function sendEmail(
  token: string,
  to: string,
  subject: string,
  body: { text: string; html: string },
  files: Attachment[],
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const id = crypto.randomUUID()
  const [mixed, alt] = [`ledger-m-${id}`, `ledger-a-${id}`]
  const part = (type: string, content: string) => [
    `--${alt}`,
    `Content-Type: ${type}; charset=UTF-8`,
    'Content-Transfer-Encoding: base64',
    '',
    utf8b64(content),
  ]
  const attachments = await Promise.all(
    files.map(async (f) => [
      `--${mixed}`,
      `Content-Type: ${f.mime}; name="${f.name}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${f.name}"`,
      '',
      await mimeBase64(f.blob),
    ]),
  )
  const mime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${utf8b64(subject)}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary=${mixed}`,
    '',
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary=${alt}`,
    '',
    ...part('text/plain', body.text),
    ...part('text/html', body.html),
    `--${alt}--`,
    ...attachments.flat(),
    `--${mixed}--`,
  ].join('\r\n')
  const raw = btoa(mime)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const res = await fetchFn(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    },
  )
  if (!res.ok) throw new Error(`Gmail rejected the email (${res.status}).`)
}
