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
