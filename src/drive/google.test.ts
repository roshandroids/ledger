import { beforeEach, expect, it, vi } from 'vitest'
import { loadLatestBackup, saveToDrive, sendEmail } from './google'

const ok = (id: string) =>
  new Response(JSON.stringify({ id, webViewLink: `https://drive/${id}` }))
beforeEach(() => localStorage.clear())

const noFolder = () => new Response('{"files":[]}')

it('creates the file in a new Ledger folder, then updates the same file', async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(noFolder())
    .mockResolvedValueOnce(ok('fold'))
    .mockResolvedValueOnce(ok('abc'))
    .mockResolvedValueOnce(ok('abc'))
  const blob = new Blob(['x'])
  const first = await saveToDrive(
    'tok',
    'excel',
    'L.xlsx',
    'application/x',
    blob,
    f,
  )
  expect(first.id).toBe('abc')
  expect(JSON.parse(f.mock.calls[1][1].body).name).toBe('Ledger')
  expect(f.mock.calls[2][1].method).toBe('POST')
  expect(f.mock.calls[2][1].headers.Authorization).toBe('Bearer tok')
  await (f.mock.calls[2][1].body as Blob)
    .text()
    .then((b) => expect(b).toContain('"parents":["fold"]'))
  await saveToDrive('tok', 'excel', 'L.xlsx', 'application/x', blob, f)
  expect(f.mock.calls[3][0]).toContain('/files/abc?')
  expect(f.mock.calls[3][1].method).toBe('PATCH')
})

it('recreates when the remembered file is gone', async () => {
  localStorage.setItem(
    'ledger-drive-files-v2',
    JSON.stringify({ backup: 'old' }),
  )
  const f = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response('{"files":[{"id":"fold"}]}'))
    .mockResolvedValueOnce(ok('new'))
  const r = await saveToDrive(
    't',
    'backup',
    'b.json',
    'application/json',
    new Blob(['{}']),
    f,
  )
  expect(r.id).toBe('new')
  expect(f.mock.calls[2][1].method).toBe('POST')
})

it('throws on a failed save', async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(new Response('{"files":[{"id":"fold"}]}'))
    .mockResolvedValue(new Response('', { status: 403 }))
  await expect(
    saveToDrive('t', 'excel', 'x', 'm', new Blob([]), f),
  ).rejects.toThrow('403')
})

it('loads the newest backup text, or null when none exists', async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ files: [{ id: 'z' }] })),
    )
    .mockResolvedValueOnce(new Response('{"a":1}'))
  expect(await loadLatestBackup('t', f)).toBe('{"a":1}')
  expect(f.mock.calls[1][0]).toContain('/files/z?alt=media')
  const none = vi.fn().mockResolvedValue(new Response('{"files":[]}'))
  expect(await loadLatestBackup('t', none)).toBeNull()
})

it('emails the attachment through the Gmail API', async () => {
  const f = vi.fn().mockResolvedValue(new Response('{}'))
  await sendEmail(
    't',
    'me@x.com',
    'Budget ✓',
    { text: 'hi', html: '<b>hi</b>' },
    [
      { name: 'L.xlsx', mime: 'application/x', blob: new Blob(['data']) },
      { name: 'L.pdf', mime: 'application/pdf', blob: new Blob(['pdf']) },
    ],
    f,
  )
  expect(f.mock.calls[0][0]).toContain('/gmail/v1/users/me/messages/send')
  const { raw } = JSON.parse(f.mock.calls[0][1].body)
  const mime = atob(raw.replace(/-/g, '+').replace(/_/g, '/'))
  expect(mime).toContain('To: me@x.com')
  expect(mime).toContain('filename="L.xlsx"')
  expect(mime).toContain('filename="L.pdf"')
  expect(mime).toContain('text/html')
  expect(mime).toContain(btoa('data'))
  f.mockResolvedValue(new Response('', { status: 403 }))
  await expect(
    sendEmail('t', 'a@b.c', 's', { text: 'b', html: 'b' }, [], f),
  ).rejects.toThrow('403')
})
