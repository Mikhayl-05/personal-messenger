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

// Keep the original source archive unchanged while splitting large vendor bundles.
const optimizedViteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Personal Messenger',
        short_name: 'Messenger',
        description: 'Ruang percakapan pribadi.',
        theme_color: '#f5f7fb',
        background_color: '#f5f7fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\\/\\/.*\\.supabase\\.co\\/rest\\/v1\\//,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return
          if (id.includes('/node_modules/@supabase/')) return 'supabase-vendor'
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'react-vendor'
          if (id.includes('/node_modules/lucide-react/')) return 'icons-vendor'
          if (id.includes('/node_modules/zod/')) return 'validation-vendor'
          if (id.includes('/node_modules/workbox-')) return 'workbox-vendor'
        }
      }
    }
  },
  server: { host: '0.0.0.0' }
})
`
writeFileSync(join(root, 'vite.config.ts'), optimizedViteConfig, 'utf8')
console.log('Personal Messenger source materialized with optimized vendor chunks.')


// Apply the password-only admin entry and keep it off the visitor landing page.
const appPath = join(root, 'src', 'App.tsx')
let app = readFileSync(appPath, 'utf8')
const replacements = [
  ["const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined", "const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined\nconst adminLoginEmail = import.meta.env.VITE_ADMIN_LOGIN_EMAIL as string | undefined"],
  ["    const email = String(form.get('email') || '').trim()\n    const password = String(form.get('password') || '')", "    const password = String(form.get('password') || '')\n    const email = adminLoginEmail?.trim() || ''\n    if (!email) { setAdminError('Konfigurasi login administrator belum tersedia.'); return }"],
  ["onOwner={() => navigate('owner-login')} toasts={toasts}", "toasts={toasts}"],
  ["  if (path.startsWith('/owner/chat/')) return 'owner-chat'\n  if (path === '/owner/inbox' || path === '/owner' || path.startsWith('/owner/')) return path === '/owner' ? 'owner-login' : 'owner-inbox'", "  if (path.startsWith('/admin/chat/')) return 'owner-chat'\n  if (path === '/admin/inbox' || path === '/admin' || path.startsWith('/admin/')) return path === '/admin' ? 'owner-login' : 'owner-inbox'\n  if (path.startsWith('/owner/chat/')) return 'owner-chat'\n  if (path === '/owner/inbox' || path === '/owner' || path.startsWith('/owner/')) return path === '/owner' ? 'owner-login' : 'owner-inbox'"],
  ["'owner-login': '/owner', 'owner-inbox': '/owner/inbox', 'owner-chat': '/owner/inbox'", "'owner-login': '/admin', 'owner-inbox': '/admin/inbox', 'owner-chat': '/admin/inbox'"],
  ["function Welcome({ visitorName, setVisitorName, busy, onSubmit, onOwner, toasts }: {\n  visitorName: string; setVisitorName: (v: string) => void; busy: boolean; onSubmit: (e: FormEvent) => void; onOwner: () => void; toasts: Toast[]", "function Welcome({ visitorName, setVisitorName, busy, onSubmit, toasts }: {\n  visitorName: string; setVisitorName: (v: string) => void; busy: boolean; onSubmit: (e: FormEvent) => void; toasts: Toast[]"],
  ["<header className=\"welcome-header\"><Brand /><button className=\"text-button\" onClick={onOwner}><LockKeyhole size={15} /> Administrator</button></header>", "<header className=\"welcome-header\"><Brand /></header>"],
  ["<form className=\"owner-form\" onSubmit={onSubmit}><label className=\"field-label\" htmlFor=\"owner-email\">EMAIL ADMIN</label><input id=\"owner-email\" name=\"email\" type=\"email\" className=\"text-input\" autoComplete=\"username\" required placeholder=\"admin@example.com\" />\n      <label className=\"field-label\" htmlFor=\"owner-password\">PASSWORD</label>", "<form className=\"owner-form\" onSubmit={onSubmit}><label className=\"field-label\" htmlFor=\"owner-password\">PASSWORD</label>"]
]
for (const [before, after] of replacements) {
  if (!app.includes(before)) throw new Error('Expected admin-login source fragment not found: ' + before.slice(0, 90))
  app = app.replace(before, after)
}
writeFileSync(appPath, app, 'utf8')
const envTypesPath = join(root, 'src', 'vite-env.d.ts')
let envTypes = readFileSync(envTypesPath, 'utf8')
if (!envTypes.includes('VITE_ADMIN_LOGIN_EMAIL')) {
  envTypes = envTypes.replace('  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string', '  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string\\n  readonly VITE_ADMIN_LOGIN_EMAIL?: string')
  writeFileSync(envTypesPath, envTypes, 'utf8')
}
console.log('Password-only administrator login configured at /admin; no admin link is rendered on the visitor landing page.')
