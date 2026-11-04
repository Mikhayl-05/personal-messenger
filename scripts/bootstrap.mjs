import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const partsDirectory = join(root, 'source-parts')
const parts = readdirSync(partsDirectory).filter((name) => /^part-\d{2}(?:-\d{2})?\.b64$/.test(name)).sort()
if (parts.length !== 28) throw new Error('Expected 28 source archive segments; found ' + parts.length + '.')
const encoded = parts.map((name) => readFileSync(join(partsDirectory, name), 'utf8').trim()).join('')
if (encoded.length !== 56312) throw new Error('Source archive length mismatch: ' + encoded.length)
writeFileSync(join(root, 'personal-messenger-source.b64'), encoded, 'ascii')
execFileSync('node', ['scripts/materialize-source.mjs'], { cwd: root, stdio: 'inherit' })
