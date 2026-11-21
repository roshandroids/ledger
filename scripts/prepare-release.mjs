import { readFileSync, writeFileSync } from 'node:fs'

const readJson = (name) => JSON.parse(readFileSync(name, 'utf8'))
const { version } = readJson('package.json')
const lock = readJson('package-lock.json')
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error(
    'Production releases require a stable MAJOR.MINOR.PATCH version.',
  )
}
if (lock.version !== version || lock.packages[''].version !== version) {
  throw new Error(
    'package.json and package-lock.json must have the same version.',
  )
}
const changelog = readFileSync('CHANGELOG.md', 'utf8').replaceAll('\r\n', '\n')
const sections = changelog.split(/^## /m).slice(1)
const [heading, ...lines] = sections[0]?.split('\n') ?? []
const notes = lines.join('\n').trim()
if (
  !heading?.startsWith(`[${version}] - `) ||
  !/^\d{4}-\d{2}-\d{2}$/.test(heading.slice(`[${version}] - `.length)) ||
  !/^[-*] \S/m.test(notes)
) {
  throw new Error(
    `Add a dated ## [${version}] - YYYY-MM-DD section with release notes at the top of CHANGELOG.md.`,
  )
}
const commit = process.env.GITHUB_SHA
if (!/^[a-f0-9]{40}$/.test(commit ?? '')) {
  throw new Error(
    'Release metadata requires the exact Git commit in GITHUB_SHA.',
  )
}

// A new version installs a fresh offline shell even when worker logic is unchanged.
const worker = 'dist/sw.js'
const source = readFileSync(worker, 'utf8')
const versionDeclaration = /^const VERSION = 'ledger-v\d+'$/m
if (!versionDeclaration.test(source))
  throw new Error('Missing service worker cache version.')
writeFileSync(
  worker,
  source.replace(
    versionDeclaration,
    `const VERSION = 'ledger-release-${version}'`,
  ),
)
writeFileSync('dist/release.json', JSON.stringify({ version, commit }) + '\n')
writeFileSync('dist-release-notes.md', notes + '\n')
