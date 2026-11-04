import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const archivePath = join(root, 'personal-messenger-source.b64')
if (!existsSync(archivePath)) {
  console.error('Source archive personal-messenger-source.b64 is missing.')
  process.exit(1)
}

const archive = join(root, '.personal-messenger-source.tar.gz')
const { readFileSync, writeFileSync, unlinkSync } = await import('node:fs')
writeFileSync(archive, Buffer.from(readFileSync(archivePath, 'utf8').trim(), 'base64'))
execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', root], { stdio: 'inherit' })
unlinkSync(archive)
console.log('Personal Messenger source materialized.')
