import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages requires serving under /LACSWORLD/
// Local dev must be served from / (root)
const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/LACSWORLD/' : '/',
  server: {
    host: '0.0.0.0',
    port: 3092,
    strictPort: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})