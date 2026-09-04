import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this as a project site under /tripplanner/, but
  // Vercel serves it at the domain root. Vercel sets process.env.VERCEL
  // automatically during its builds, so use that to pick the right base path
  // without needing separate build configs per host.
  base: process.env.VERCEL ? '/' : '/tripplanner/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
