import { beforeEach, expect, it, vi } from 'vitest'
import { loadLatestBackup, saveToDrive } from './google'

const ok = (id: string) =>
  new Response(JSON.stringify({ id, webViewLink: `https://drive/${id}` }))
beforeEach(() => localStorage.clear())

it('creates the file first, then updates the same file', async () => {
  const f = vi
    .fn()
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
  expect(f.mock.calls[0][1].method).toBe('POST')
  expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
  await saveToDrive('tok', 'excel', 'L.xlsx', 'application/x', blob, f)
  expect(f.mock.calls[1][0]).toContain('/files/abc?')
  expect(f.mock.calls[1][1].method).toBe('PATCH')
})

it('recreates when the remembered file is gone', async () => {
  localStorage.setItem('ledger-drive-files', JSON.stringify({ backup: 'old' }))
  const f = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 404 }))
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
  expect(f.mock.calls[1][1].method).toBe('POST')
})

it('throws on a failed save', async () => {
  const f = vi.fn().mockResolvedValue(new Response('', { status: 403 }))
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
