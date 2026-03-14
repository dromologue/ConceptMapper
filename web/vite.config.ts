import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path must be relative for file:// loading in WKWebView
  base: './',
  build: {
    // Ensure WASM files are included as assets
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    exclude: ['./src/wasm/concept_mapper_core'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    css: true,
    root: '.',
  },
})
