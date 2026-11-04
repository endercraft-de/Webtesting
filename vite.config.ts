import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * pdf.js and pdf-lib ship raw control characters and U+FFFD inside string literals.
 * Rewrite them as escape sequences so the emitted JS is plain text (needed by some hosts).
 */
const escape = (code: string) =>
  code.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f�]/g, (c) => {
    const n = c.charCodeAt(0)
    return n > 0xff ? '\\u' + n.toString(16).padStart(4, '0') : '\\x' + n.toString(16).padStart(2, '0')
  })

const escapeControlChars = (): Plugin => ({
  name: 'escape-control-chars',
  generateBundle(_, bundle) {
    for (const f of Object.values(bundle)) {
      if (!/\.m?js$/.test(f.fileName)) continue
      if (f.type === 'chunk') f.code = escape(f.code)
      else f.source = escape(typeof f.source === 'string' ? f.source : new TextDecoder().decode(f.source))
    }
  },
})

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), escapeControlChars()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
})
