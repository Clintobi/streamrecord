import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Preload the latin fonts used above the fold, so text doesn't reflow (layout shift) when they arrive.
const CRITICAL_FONTS = [/atkinson-hyperlegible-next-latin-400-normal-.*\.woff2$/, /atkinson-hyperlegible-next-latin-700-normal-.*\.woff2$/, /source-serif-4-latin-600-normal-.*\.woff2$/]
const preloadFonts = (): Plugin => ({
  name: 'preload-fonts',
  apply: 'build',
  transformIndexHtml(html, ctx) {
    const files = Object.keys(ctx.bundle || {}).filter((f) => CRITICAL_FONTS.some((r) => r.test(f)))
    return { html, tags: files.map((f) => ({ tag: 'link', attrs: { rel: 'preload', href: `./${f}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' as const })) }
  },
})

export default defineConfig({ plugins: [react(), preloadFonts()], base: './', build: { target: 'es2019', chunkSizeWarningLimit: 400 } })
